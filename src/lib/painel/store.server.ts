import { getSupabase } from "@/lib/supabase.server";
import { META_GLOBAL, SETORES } from "./config";
import type { Painel, Realizado, SetorId } from "./types";

const zerado = (): Realizado =>
  Object.fromEntries(SETORES.map((s) => [s.id, Array(12).fill(0)])) as Realizado;

const metasPadrao = (): Record<SetorId, number> =>
  Object.fromEntries(SETORES.map((s) => [s.id, s.metaAnual])) as Record<SetorId, number>;

type LinhaRealizado = { setor: SetorId; mes: number; valor: number | string };
type LinhaMeta = { setor: SetorId; meta: number | string };

/** Monta o painel do ano lendo do Supabase. */
export async function carregarPainel(ano: number): Promise<Painel> {
  const sb = getSupabase();

  const [anoRes, setorRes, realizadoRes] = await Promise.all([
    sb.from("meta_ano").select("meta_global").eq("ano", ano).maybeSingle(),
    sb.from("meta_setor").select("setor, meta").eq("ano", ano),
    sb.from("realizado_mensal").select("setor, mes, valor").eq("ano", ano),
  ]);

  const erro = anoRes.error ?? setorRes.error ?? realizadoRes.error;
  if (erro) throw new Error(`Falha ao carregar o painel de ${ano}: ${erro.message}`);

  const metasSetor = metasPadrao();
  for (const linha of (setorRes.data ?? []) as LinhaMeta[]) {
    metasSetor[linha.setor] = Number(linha.meta);
  }

  const realizado = zerado();
  for (const linha of (realizadoRes.data ?? []) as LinhaRealizado[]) {
    if (realizado[linha.setor] && linha.mes >= 1 && linha.mes <= 12) {
      realizado[linha.setor][linha.mes - 1] = Number(linha.valor);
    }
  }

  return {
    ano,
    metaGlobal:
      Number((anoRes.data as { meta_global?: number } | null)?.meta_global) || META_GLOBAL,
    metasSetor,
    realizado,
    atualizadoEm: new Date().toISOString(),
  };
}

/**
 * Troca o realizado do ano pelo que veio do monday. É substituição, não soma:
 * o quadro é a fonte da verdade, então mês apagado lá some daqui também.
 *
 * Só apaga se a leitura trouxe alguma linha — assim uma resposta vazia por
 * falha de rede não zera o painel.
 */
export async function substituirRealizado(
  ano: number,
  linhas: { setor: SetorId; mes: number; valor: number }[],
): Promise<number> {
  if (linhas.length === 0) return 0;
  const sb = getSupabase();

  const { error: erroApagar } = await sb.from("realizado_manual").delete().eq("ano", ano);
  if (erroApagar) throw new Error(`Falha ao limpar o realizado de ${ano}: ${erroApagar.message}`);

  const { error } = await sb
    .from("realizado_manual")
    .insert(linhas.map((l) => ({ ano, setor: l.setor, mes: l.mes, valor: l.valor })));
  if (error) throw new Error(`Falha ao gravar o realizado de ${ano}: ${error.message}`);

  return linhas.length;
}

/** Atualiza as metas do ano com o que está no quadro. */
export async function salvarMetas(
  ano: number,
  metasSetor: Partial<Record<SetorId, number>>,
  metaGlobal: number | null,
): Promise<void> {
  const sb = getSupabase();

  if (metaGlobal !== null) {
    const { error } = await sb
      .from("meta_ano")
      .upsert(
        { ano, meta_global: metaGlobal, atualizado_em: new Date().toISOString() },
        { onConflict: "ano" },
      );
    if (error) throw new Error(`Falha ao gravar a meta global: ${error.message}`);
  }

  const linhas = Object.entries(metasSetor)
    .filter(([, meta]) => typeof meta === "number" && meta > 0)
    .map(([setor, meta]) => ({ ano, setor, meta: meta as number }));

  if (linhas.length > 0) {
    const { error } = await sb.from("meta_setor").upsert(linhas, { onConflict: "ano,setor" });
    if (error) throw new Error(`Falha ao gravar as metas por setor: ${error.message}`);
  }
}
