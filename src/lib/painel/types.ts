export type SetorId = "transporte" | "agenciamento" | "desembaraco";

export type Setor = {
  id: SetorId;
  nome: string;
  /** Meta anual individual do setor, em reais. */
  metaAnual: number;
  cor: string;
};

/** Realizado mensal por setor, em reais. Índice 0 = janeiro. */
export type Realizado = Record<SetorId, number[]>;

export type Painel = {
  ano: number;
  /** Meta anual global do grupo, em reais. Pode ser menor que a soma das metas individuais. */
  metaGlobal: number;
  /** Meta anual de cada setor, em reais. */
  metasSetor: Record<SetorId, number>;
  /** Realizado por setor e mês, sincronizado do quadro do monday. */
  realizado: Realizado;
  atualizadoEm: string;
};
