import * as XLSX from "xlsx";
import { SETOR_POR_ID } from "./config";
import type { SetorId } from "./types";

const ABA = "Acompanhamento anual";

const MESES_CURTOS: Record<string, number> = {
  jan: 0,
  fev: 1,
  mar: 2,
  abr: 3,
  mai: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  set: 8,
  out: 9,
  nov: 10,
  dez: 11,
};

/**
 * Fragmento que identifica cada setor no título do bloco. O de agenciamento
 * é curto de propósito: a planilha real escreve "Agenciameto" — sem o "n"
 * antes do "to" —, então uma palavra-chave do tamanho de "agenciamento"
 * nunca bate com o título de verdade e a detecção cai sempre no padrão fixo.
 */
const PALAVRA_SETOR: Record<SetorId, string> = {
  transporte: "transport",
  agenciamento: "agencia",
  desembaraco: "desembarac",
};

/**
 * Posições de coluna válidas em toda versão da planilha vista até hoje —
 * usadas só se a detecção pelo cabeçalho falhar (aba reorganizada, título
 * reescrito de um jeito que a busca não reconhece).
 */
const COLUNAS_PADRAO: Record<SetorId, { mes: number; valor: number }> = {
  desembaraco: { mes: 1, valor: 2 },
  transporte: { mes: 6, valor: 7 },
  agenciamento: { mes: 11, valor: 12 },
};

function normalizar(v: unknown): string {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/** Aceita número direto ou texto em formato pt-BR ("1.234,56"). */
function paraNumero(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const limpo = v.replace(/[^\d,.-]/g, "").trim();
  if (!limpo) return null;
  const normal = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

export type LinhaPlanilha = { setor: SetorId; mes: number; valor: number };

export type LeituraPlanilha = {
  /** Só os meses com valor lançado — é o que vai para o banco. */
  linhas: LinhaPlanilha[];
  /** Série completa (12 posições, 0 = sem lançamento) — para comparar com o que já está gravado. */
  serie: Record<SetorId, number[]>;
  avisos: string[];
};

/**
 * Lê SOMENTE a aba "Acompanhamento anual" — por decisão do usuário, é o
 * resumo oficial da planilha, mesmo nas vezes em que as abas de detalhe têm
 * um lançamento mais recente que ainda não chegou ao resumo.
 *
 * As colunas não são fixas por posição: procura o par de cabeçalhos "mês" /
 * "valor faturado" mais perto do título de cada setor, o que sobrevive a uma
 * coluna inserida ou removida em outro lugar da planilha. Cai nas posições
 * conhecidas (`COLUNAS_PADRAO`) só se essa busca não achar nada.
 */
export function lerPlanilha(bytes: ArrayBuffer): LeituraPlanilha {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(bytes, { type: "array" });
  } catch {
    throw new Error("Não consegui abrir o arquivo — confira se é um .xlsx válido.");
  }

  const ws = wb.Sheets[ABA];
  if (!ws) {
    const outras = wb.SheetNames.join(", ");
    throw new Error(`A planilha não tem uma aba chamada "${ABA}". Abas encontradas: ${outras}.`);
  }

  const linhas = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null });

  const avisos: string[] = [];
  const colunas: Partial<Record<SetorId, { mes: number; valor: number }>> = {};

  // O título de cada bloco ("Desembaraço", "Transporte", "Agenciameto") fica
  // numa das primeiras linhas — já vimos a aba com uma linha em branco no
  // topo, então a busca olha as 4 primeiras em vez de assumir a primeira.
  const linhaTitulo = linhas
    .slice(0, 4)
    .findIndex((l) =>
      l?.some((c) => Object.values(PALAVRA_SETOR).some((p) => normalizar(c).includes(p))),
    );

  if (linhaTitulo >= 0) {
    const titulos = linhas[linhaTitulo] ?? [];
    for (const setor of Object.keys(PALAVRA_SETOR) as SetorId[]) {
      const colTitulo = titulos.findIndex((c) => normalizar(c).includes(PALAVRA_SETOR[setor]));
      if (colTitulo < 0) continue;

      busca: for (let l = linhaTitulo + 1; l <= linhaTitulo + 2 && l < linhas.length; l++) {
        const cabecalho = linhas[l] ?? [];
        for (let col = colTitulo; col < colTitulo + 4 && col < cabecalho.length; col++) {
          if (normalizar(cabecalho[col]) === "mes") {
            colunas[setor] = { mes: col, valor: col + 1 };
            break busca;
          }
        }
      }
    }
  }

  for (const setor of Object.keys(COLUNAS_PADRAO) as SetorId[]) {
    if (!colunas[setor]) {
      avisos.push(
        `não achei o cabeçalho do bloco "${SETOR_POR_ID[setor].nome}"; usando a posição padrão dessa coluna.`,
      );
      colunas[setor] = COLUNAS_PADRAO[setor];
    }
  }

  const serie: Record<SetorId, number[]> = {
    transporte: Array<number>(12).fill(0),
    agenciamento: Array<number>(12).fill(0),
    desembaraco: Array<number>(12).fill(0),
  };
  const resultado: LinhaPlanilha[] = [];

  for (const setor of Object.keys(colunas) as SetorId[]) {
    const { mes: colMes, valor: colValor } = colunas[setor]!;
    for (const linha of linhas) {
      if (!linha) continue;
      const idxMes = MESES_CURTOS[normalizar(linha[colMes])];
      if (idxMes === undefined) continue;

      const valor = paraNumero(linha[colValor]);
      if (valor === null) continue;

      serie[setor][idxMes] = valor;
      // Mês sem lançamento não vira linha — ausência é diferente de zero, e a
      // gravação substitui o ano inteiro; um zero aqui apagaria um mês que só
      // não está preenchido nesta versão do arquivo.
      if (valor !== 0) resultado.push({ setor, mes: idxMes + 1, valor });
    }
  }

  if (resultado.length === 0) {
    throw new Error(
      `Não encontrei nenhum mês com valor na aba "${ABA}". Confira se o arquivo é o certo.`,
    );
  }

  return { linhas: resultado, serie, avisos };
}
