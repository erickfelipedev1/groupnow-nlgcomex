import { calcular, type Metricas } from "./metrics";
import { competencia } from "./rdstation";
import { carregarPainel } from "./store.server";

/** Ano do painel: `PAINEL_ANO` nos secrets, ou o ano corrente em São Paulo. */
export function anoDoPainel(): number {
  return Number(process.env["PAINEL_ANO"]) || competencia(new Date()).ano;
}

export async function carregarMetricas(ano = anoDoPainel()): Promise<Metricas> {
  return calcular(await carregarPainel(ano));
}
