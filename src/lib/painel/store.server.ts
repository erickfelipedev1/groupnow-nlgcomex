import { getSupabase } from "@/lib/supabase.server";
import { META_GLOBAL, SETORES } from "./config";
import type { Negocio, Painel, Realizado, SetorId } from "./types";

const zerado = (): Realizado =>
  Object.fromEntries(SETORES.map((s) => [s.id, Array(12).fill(0)])) as Realizado;

const metasPadrao = (): Record<SetorId, number> =>
  Object.fromEntries(SETORES.map((s) => [s.id, s.metaAnual])) as Record<SetorId, number>;

type LinhaRealizado = { setor: SetorId; mes: number; valor: number | string };
type LinhaMeta = { setor: SetorId; meta: number | string };

/**
 * Monta o painel do ano lendo do Supabase. `realizado_mensal` já é a soma da
 * base manual com os negócios do CRM.
 */
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
    // O painel não guarda mais os negócios em memória: eles já entraram na view.
    negocios: {},
    atualizadoEm: new Date().toISOString(),
  };
}

/**
 * Grava (ou remove) um negócio do CRM. Upsert por `external_id`: reenviar o
 * mesmo negócio atualiza a linha em vez de somar de novo.
 */
export async function salvarNegocio(
  externalId: string,
  negocio: Negocio | null,
  ano: number,
): Promise<void> {
  const sb = getSupabase();

  if (!negocio) {
    const { error } = await sb.from("negocio").delete().eq("external_id", externalId);
    if (error) throw new Error(`Falha ao remover o negócio ${externalId}: ${error.message}`);
    return;
  }

  const { error } = await sb.from("negocio").upsert(
    {
      external_id: externalId,
      ano,
      mes: negocio.mes,
      setor: negocio.setor,
      valor: negocio.valor,
      nome: negocio.nome ?? null,
      funil: negocio.funil ?? null,
      fechado_em: negocio.fechadoEm ?? null,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "external_id" },
  );
  if (error) throw new Error(`Falha ao gravar o negócio ${externalId}: ${error.message}`);
}
