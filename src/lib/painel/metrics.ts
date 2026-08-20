import { MESES_CURTOS, META_GLOBAL, SETORES } from "./config";
import type { Margem, Painel, SetorId } from "./types";

const pct = (parte: number, total: number) => (total > 0 ? (parte / total) * 100 : 0);
const soma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export type ResumoSetor = {
  id: SetorId;
  nome: string;
  cor: string;
  metaAnual: number;
  realizadoAno: number;
  /** Progresso anual individual: realizado / meta do próprio setor. */
  progressoAnual: number;
  /** Progresso individual mês a mês, em % da meta do setor. */
  progressoMensal: number[];
  /** Fatia do setor dentro do progresso global do grupo. */
  representatividade: number;
};

export type Metricas = {
  ano: number;
  atualizadoEm: string;
  metaGlobal: number;
  realizadoAno: number;
  /** Progresso anual global: realizado total / meta global. */
  progressoGlobal: number;
  /** Progresso global mês a mês, em % da meta global. */
  progressoGlobalMensal: number[];
  setores: ResumoSetor[];
  /** Margem por unidade, em %. Não deriva do realizado — vem de outro quadro. */
  margem: Margem;
};

export function calcular(painel: Painel): Metricas {
  const metaGlobal = painel.metaGlobal || META_GLOBAL;

  const setores: ResumoSetor[] = SETORES.map((setor) => {
    const meses = painel.realizado[setor.id] ?? Array(12).fill(0);
    const realizadoAno = soma(meses);
    const metaAnual = painel.metasSetor?.[setor.id] || setor.metaAnual;
    return {
      id: setor.id,
      nome: setor.nome,
      cor: setor.cor,
      metaAnual,
      realizadoAno,
      progressoAnual: pct(realizadoAno, metaAnual),
      progressoMensal: meses.map((v) => pct(v, metaAnual)),
      representatividade: 0,
    };
  });

  const realizadoAno = soma(setores.map((s) => s.realizadoAno));
  for (const s of setores) {
    s.representatividade = pct(s.realizadoAno, realizadoAno);
  }

  const progressoGlobalMensal = MESES_CURTOS.map((_, mes) =>
    pct(soma(setores.map((s) => painel.realizado[s.id]?.[mes] ?? 0)), metaGlobal),
  );

  return {
    ano: painel.ano,
    atualizadoEm: painel.atualizadoEm,
    metaGlobal,
    realizadoAno,
    progressoGlobal: pct(realizadoAno, metaGlobal),
    progressoGlobalMensal,
    setores,
    margem: painel.margem ?? {},
  };
}

export const fmtPct = (v: number, casas = 2) =>
  `${v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;

export const fmtMoeda = (v: number) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
