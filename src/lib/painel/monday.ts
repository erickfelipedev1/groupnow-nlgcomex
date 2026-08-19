import { SETOR_POR_ID } from "./config";
import type { SetorId } from "./types";

/**
 * Leitura do quadro "Metas do Grupo Now" no monday.com.
 *
 * O modelo lá é: grupo = setor, item = mês, e três colunas numéricas com o
 * faturamento do mês, a meta anual do setor e a meta global do grupo.
 */
export const BOARD_METAS = "18399927931";

export const COLUNA = {
  faturamento: "numeric_mm0gmsgs",
  metaAnual: "numeric_mm0hmpzk",
  metaGlobal: "numeric_mm15gwvr",
} as const;

export const QUERY_METAS = `query {
  boards (ids: [${BOARD_METAS}]) {
    items_page (limit: 200) {
      items {
        name
        group { title }
        column_values (ids: ["${COLUNA.faturamento}", "${COLUNA.metaAnual}", "${COLUNA.metaGlobal}"]) {
          id
          text
        }
      }
    }
  }
}`;

const MESES: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

/** Tira acento, caixa e espaço sobrando — os títulos são digitados à mão. */
function chave(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** O grupo do monday traz emoji e espaços; só nos interessa a palavra do setor. */
export function setorDoGrupo(titulo: string): SetorId | null {
  const alvo = chave(titulo);
  for (const id of Object.keys(SETOR_POR_ID) as SetorId[]) {
    if (alvo.includes(id)) return id;
  }
  return null;
}

export function mesDoItem(nome: string): number | null {
  return MESES[chave(nome)] ?? null;
}

/**
 * O monday devolve número como texto. Vem com ponto decimal ("262513.06"), mas
 * aceitamos também o formato pt-BR caso alguém edite a coluna à mão.
 */
export function numero(texto: string | null | undefined): number | null {
  if (!texto) return null;
  const limpo = texto.replace(/[^\d,.-]/g, "").trim();
  if (!limpo) return null;

  const temVirgula = limpo.includes(",");
  const normal = temVirgula ? limpo.replace(/\./g, "").replace(",", ".") : limpo;

  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

export type LinhaRealizado = { setor: SetorId; mes: number; valor: number };

export type LeituraMonday = {
  linhas: LinhaRealizado[];
  metasSetor: Partial<Record<SetorId, number>>;
  metaGlobal: number | null;
  /** Itens que não viraram linha, para aparecer na resposta do sync. */
  ignorados: string[];
};

type ColunaRaw = { id?: unknown; text?: unknown };
type ItemRaw = { name?: unknown; group?: { title?: unknown }; column_values?: unknown };

function texto(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** Converte a resposta do GraphQL no que o painel entende. */
export function interpretar(resposta: unknown): LeituraMonday {
  const raiz = resposta as Record<string, unknown> | null;
  const dados = raiz?.["data"] as Record<string, unknown> | undefined;
  const boards = dados?.["boards"];
  const board = Array.isArray(boards)
    ? (boards[0] as Record<string, unknown> | undefined)
    : undefined;
  const page = board?.["items_page"] as Record<string, unknown> | undefined;
  const items = page?.["items"];

  const leitura: LeituraMonday = {
    linhas: [],
    metasSetor: {},
    metaGlobal: null,
    ignorados: [],
  };
  if (!Array.isArray(items)) return leitura;

  for (const bruto of items as ItemRaw[]) {
    const nome = texto(bruto.name);
    const grupo = texto(bruto.group?.title);
    const setor = setorDoGrupo(grupo);
    const mes = mesDoItem(nome);

    if (!setor || !mes) {
      leitura.ignorados.push(`${grupo || "sem grupo"} / ${nome || "sem nome"}`);
      continue;
    }

    const colunas = Array.isArray(bruto.column_values) ? (bruto.column_values as ColunaRaw[]) : [];
    const valorDe = (id: string) => numero(texto(colunas.find((c) => texto(c.id) === id)?.text));

    // Mês sem faturamento lançado não vira linha: o painel trata ausência como
    // zero, e assim não sobrescrevemos com zero um mês que ainda não fechou.
    const faturamento = valorDe(COLUNA.faturamento);
    if (faturamento !== null) {
      leitura.linhas.push({ setor, mes, valor: faturamento });
    }

    // Meta anual e meta global se repetem em todos os itens do setor; a última
    // leitura vale, e todas trazem o mesmo número.
    const metaAnual = valorDe(COLUNA.metaAnual);
    if (metaAnual !== null && metaAnual > 0) leitura.metasSetor[setor] = metaAnual;

    const metaGlobal = valorDe(COLUNA.metaGlobal);
    if (metaGlobal !== null && metaGlobal > 0) leitura.metaGlobal = metaGlobal;
  }

  return leitura;
}
