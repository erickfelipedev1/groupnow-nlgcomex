/**
 * Modo demonstração: dados e registro totalmente fictícios, para a versão
 * pública de portfólio.
 *
 * A flag vem de `import.meta.env`, não de `process.env`, para o bundler
 * embutir o valor nos dois lados. Se só o servidor soubesse do modo demo, ele
 * mandaria dados fictícios e o cliente tentaria casá-los com o registro real —
 * os setores não bateriam e a tela ficaria vazia.
 */
export const DEMO = import.meta.env["VITE_DEMO_MODE"] === "1";

import type { Metricas, ResumoSetor } from "./metrics";

/** Empresa fictícia. Nada aqui remete a cliente real. */
export const MARCA_DEMO = {
  nome: "Rota Norte Logística",
  subtitulo: "Painel de Metas",
};

/**
 * Registro fictício de setores. Mantém os mesmos ids do registro real porque
 * eles são termos genéricos do setor logístico e são a chave dos mapas de
 * ícone e cor no cliente — trocar o id sem trocar os mapas deixaria tudo
 * "não classificado".
 */
const SETORES_DEMO = [
  { id: "transporte", nome: "Rodoviário", cor: "#eab22e", meta: 3_000_000 },
  { id: "agenciamento", nome: "Agenciamento", cor: "#cc3366", meta: 3_000_000 },
  { id: "desembaraco", nome: "Aduaneiro", cor: "#8b7cff", meta: 3_000_000 },
] as const;

/** Equipe fictícia. Sem foto: o card cai no avatar de iniciais. */
export const EQUIPE_DEMO = [
  { nome: "Ana Ribeiro", setor: "transporte" },
  { nome: "Bruno Castro", setor: "transporte" },
  { nome: "Carla Menezes", setor: "agenciamento" },
  { nome: "Diego Farias", setor: "agenciamento" },
  { nome: "Elisa Tavares", setor: "agenciamento" },
  { nome: "Fábio Nunes", setor: "desembaraco" },
  { nome: "Gabriela Lima", setor: "desembaraco" },
  { nome: "Henrique Sá", setor: "desembaraco" },
];

export const DESCRICAO_SETOR_DEMO: Record<string, string> = {
  transporte: "Coleta, transferência e entrega",
  agenciamento: "Agenciamento de cargas e parcerias",
  desembaraco: "Desembaraço e documentação",
};

/**
 * Série mensal fictícia, determinística: o painel é uma vitrine e precisa
 * mostrar o mesmo desenho toda vez que alguém abre. Nada de Math.random.
 */
const FATURAMENTO_DEMO: Record<string, number[]> = {
  transporte: [214_500, 186_300, 241_800, 198_700, 262_400, 233_900, 275_100, 0, 0, 0, 0, 0],
  agenciamento: [301_200, 268_900, 355_400, 412_800, 329_600, 388_100, 447_300, 0, 0, 0, 0, 0],
  desembaraco: [142_700, 168_400, 121_900, 195_300, 157_800, 176_200, 188_600, 0, 0, 0, 0, 0],
};

const MARGEM_DEMO: (number | null)[] = [
  38.4,
  41.2,
  36.9,
  43.5,
  39.8,
  42.1,
  40.6,
  null,
  null,
  null,
  null,
  null,
];

/** Unidade fictícia cuja margem o painel acompanha. */
export const UNIDADE_MARGEM_DEMO = "Matriz";

const META_GLOBAL_DEMO = 7_600_000;

const soma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const pct = (parte: number, total: number) => (total > 0 ? (parte / total) * 100 : 0);

/**
 * Métricas prontas, no mesmo formato que `calcular()` devolve — o cliente não
 * sabe a diferença, e nenhum código de banco é tocado para produzir isto.
 */
export function metricasDemo(): Metricas {
  const setores: ResumoSetor[] = SETORES_DEMO.map((s) => {
    const meses = FATURAMENTO_DEMO[s.id] ?? Array<number>(12).fill(0);
    const realizadoAno = soma(meses);
    return {
      id: s.id,
      nome: s.nome,
      cor: s.cor,
      metaAnual: s.meta,
      realizadoAno,
      progressoAnual: pct(realizadoAno, s.meta),
      progressoMensal: meses.map((v) => pct(v, s.meta)),
      representatividade: 0,
    };
  });

  const realizadoAno = soma(setores.map((s) => s.realizadoAno));
  for (const s of setores) s.representatividade = pct(s.realizadoAno, realizadoAno);

  const progressoGlobalMensal = Array.from({ length: 12 }, (_, mes) =>
    pct(soma(SETORES_DEMO.map((s) => FATURAMENTO_DEMO[s.id]?.[mes] ?? 0)), META_GLOBAL_DEMO),
  );

  return {
    ano: 2026,
    // Fixo, não `new Date()`: um horário que muda a cada carregamento numa
    // vitrine só levanta a dúvida de estar ligado em algo real.
    atualizadoEm: "2026-08-24T13:40:00.000Z",
    metaGlobal: META_GLOBAL_DEMO,
    realizadoAno,
    progressoGlobal: pct(realizadoAno, META_GLOBAL_DEMO),
    progressoGlobalMensal,
    setores,
    margem: { [UNIDADE_MARGEM_DEMO]: MARGEM_DEMO },
  };
}
