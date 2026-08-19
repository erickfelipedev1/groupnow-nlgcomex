import { MAPA_FUNIL, PALAVRAS_SETOR, SETOR_POR_ID } from "./config";
import type { Negocio, SetorId } from "./types";

/**
 * Negócio do RD Station CRM. Só os campos que usamos — o payload real traz
 * bem mais coisa, e os nomes variam conforme a conta.
 */
type DealRD = Record<string, unknown>;

const TZ = "America/Sao_Paulo";

const texto = (v: unknown): string => (typeof v === "string" ? v : "");

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    // O RD manda valores como "12500.0" ou "12.500,00" dependendo da conta.
    const limpo = v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v;
    const n = Number(limpo);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** O RD envia ora o negócio direto, ora embrulhado em `payload`/`deal`. */
export function extrairDeal(corpo: unknown): DealRD | null {
  if (typeof corpo !== "object" || corpo === null) return null;
  const c = corpo as Record<string, unknown>;
  for (const chave of ["payload", "deal", "data"]) {
    const interno = c[chave];
    if (typeof interno === "object" && interno !== null && !Array.isArray(interno)) {
      return interno as DealRD;
    }
  }
  return c;
}

export function idDoDeal(deal: DealRD): string | null {
  const id = deal["id"] ?? deal["_id"] ?? deal["deal_id"];
  return id === undefined || id === null ? null : String(id);
}

/** O RD marca `win: true` no negócio ganho; `false` = perdido, `null` = em aberto. */
export function foiGanho(deal: DealRD): boolean {
  if (deal["win"] === true) return true;
  if (typeof deal["win"] === "string") return (deal["win"] as string).toLowerCase() === "true";
  return texto(deal["status"]).toLowerCase() === "won";
}

export function valorDoDeal(deal: DealRD): number {
  const direto =
    num(deal["amount_total"]) ??
    num(deal["amount_unique"]) ??
    num(deal["amount_montly"]) ??
    num(deal["value"]);
  if (direto !== null) return direto;

  const produtos = deal["deal_products"];
  if (Array.isArray(produtos)) {
    return produtos.reduce<number>((soma, p) => {
      const item = p as Record<string, unknown>;
      return soma + (num(item["total"]) ?? num(item["price"]) ?? 0);
    }, 0);
  }
  return 0;
}

export function dataDoDeal(deal: DealRD): Date {
  for (const campo of ["closed_at", "win_at", "updated_at", "created_at"]) {
    const bruto = texto(deal[campo]);
    if (bruto) {
      const d = new Date(bruto);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return new Date();
}

/** Mês (1–12) e ano da data do negócio, no fuso de São Paulo. */
export function competencia(data: Date): { mes: number; ano: number } {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    year: "numeric",
    month: "numeric",
  }).formatToParts(data);
  const pegar = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? 0);
  return { mes: pegar("month"), ano: pegar("year") };
}

/** Tira acento, caixa e espaço sobrando para comparar nomes de funil. */
function chave(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Nome do funil (pipeline) do negócio — é o campo que define o setor. */
export function nomeDoFunil(deal: DealRD): string {
  const stage = deal["deal_stage"] as Record<string, unknown> | undefined;
  return (
    texto((stage?.["deal_pipeline"] as Record<string, unknown> | undefined)?.["name"]) ||
    texto((deal["deal_pipeline"] as Record<string, unknown> | undefined)?.["name"]) ||
    texto((deal["pipeline"] as Record<string, unknown> | undefined)?.["name"]) ||
    texto(deal["pipeline_name"]) ||
    ""
  );
}

/**
 * Descobre o setor a partir do funil. `?setor=` na URL do webhook tem
 * prioridade e dispensa o mapa.
 *
 * Só olhamos o funil de propósito: o nome do negócio ("Frete SP-MG") acusaria
 * falso positivo de Transporte mesmo estando no funil de Desembaraço.
 */
export function resolverSetor(
  deal: DealRD,
  setorDaUrl?: string | null,
): { setor: SetorId | null; funil: string } {
  const funil = nomeDoFunil(deal);

  if (setorDaUrl && setorDaUrl in SETOR_POR_ID) {
    return { setor: setorDaUrl as SetorId, funil };
  }
  if (!funil) return { setor: null, funil };

  const mapeado = MAPA_FUNIL[chave(funil)];
  if (mapeado) return { setor: mapeado, funil };

  const alvo = chave(funil);
  for (const [id, palavras] of Object.entries(PALAVRAS_SETOR) as [SetorId, string[]][]) {
    if (palavras.some((p) => alvo.includes(p))) return { setor: id, funil };
  }

  return { setor: null, funil };
}

export type Traducao =
  | { ok: true; id: string; negocio: Negocio | null; ano: number; funil?: string }
  | { ok: false; erro: string; funil?: string };

/** Traduz o payload do RD Station CRM para um negócio do painel. */
export function traduzir(corpo: unknown, setorDaUrl?: string | null): Traducao {
  const deal = extrairDeal(corpo);
  if (!deal) return { ok: false, erro: "payload vazio ou inválido" };

  const id = idDoDeal(deal);
  if (!id) return { ok: false, erro: "negócio sem id" };

  const { mes, ano } = competencia(dataDoDeal(deal));

  // Negócio que não está ganho (ou deixou de estar) sai do painel.
  if (!foiGanho(deal)) return { ok: true, id, negocio: null, ano };

  const { setor, funil } = resolverSetor(deal, setorDaUrl);
  if (!setor) {
    return {
      ok: false,
      erro: funil
        ? `funil "${funil}" não está mapeado — adicione em MAPA_FUNIL (src/lib/config.ts) ou use ?setor= na URL do webhook`
        : "o payload não trouxe o funil — use ?setor=transporte|agenciamento|desembaraco na URL do webhook",
      funil,
    };
  }

  return {
    ok: true,
    id,
    ano,
    funil,
    negocio: {
      setor,
      mes,
      valor: valorDoDeal(deal),
      nome: texto(deal["name"]) || undefined,
      funil: funil || undefined,
      fechadoEm: dataDoDeal(deal).toISOString(),
    },
  };
}
