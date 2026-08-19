import type { Setor, SetorId } from "./types";

export const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export const MESES_CURTOS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
] as const;

export const SETORES: Setor[] = [
  { id: "transporte", nome: "Transporte", metaAnual: 12_000_000, cor: "#f2c94c" },
  { id: "agenciamento", nome: "Agenciamento", metaAnual: 12_000_000, cor: "#4aa3f0" },
  { id: "desembaraco", nome: "Desembaraço", metaAnual: 12_000_000, cor: "#a78bfa" },
];

export const SETOR_POR_ID = Object.fromEntries(SETORES.map((s) => [s.id, s])) as Record<
  SetorId,
  Setor
>;

export const COR_GLOBAL = "#cbd5e1";

/**
 * Meta anual global do grupo. É menor que a soma das metas individuais
 * (36 mi) porque as metas por setor são esticadas: o grupo bate 100%
 * mesmo se cada setor ficar em ~85%.
 */
export const META_GLOBAL = 30_600_000;

/**
 * Funil do RD Station CRM -> setor. É daqui que o setor sai: cada funil do RD
 * corresponde a um setor do painel.
 *
 * As chaves são comparadas sem acento, sem caixa e sem espaço sobrando, então
 * "Funil de Desembaraço" casa com "funil de desembaraco".
 */
export const MAPA_FUNIL: Record<string, SetorId> = {
  transporte: "transporte",
  "funil de transporte": "transporte",
  agenciamento: "agenciamento",
  "funil de agenciamento": "agenciamento",
  desembaraco: "desembaraco",
  "funil de desembaraco": "desembaraco",
};

/**
 * Fallback quando o nome do funil não está no MAPA_FUNIL: procura a palavra
 * dentro do nome do funil. Só é consultado se o mapa não resolver.
 */
export const PALAVRAS_SETOR: Record<SetorId, string[]> = {
  transporte: ["transporte", "frete", "rodoviari", "carreta", "logistic"],
  agenciamento: ["agenciamento", "agenciam", "agencia de carga", "freight"],
  desembaraco: ["desembaraco", "aduaneir", "despacho", "customs"],
};
