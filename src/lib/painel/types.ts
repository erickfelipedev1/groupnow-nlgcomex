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

/** Negócio ganho vindo de uma integração (RD Station), indexado pelo id de origem. */
export type Negocio = {
  setor: SetorId;
  /** 1 = janeiro … 12 = dezembro. */
  mes: number;
  valor: number;
  nome?: string | undefined;
  /** Funil de origem no RD — guardado para conferência do mapeamento. */
  funil?: string | undefined;
  fechadoEm?: string | undefined;
};

export type Painel = {
  ano: number;
  /** Meta anual global do grupo, em reais. Pode ser menor que a soma das metas individuais. */
  metaGlobal: number;
  /** Meta anual de cada setor, em reais. */
  metasSetor: Record<SetorId, number>;
  /** Lançamentos manuais / base histórica. */
  realizado: Realizado;
  /** Negócios ganhos por id de origem — regravar o mesmo id atualiza, não duplica. */
  negocios: Record<string, Negocio>;
  atualizadoEm: string;
};
