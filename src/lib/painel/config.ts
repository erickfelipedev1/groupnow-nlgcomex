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
