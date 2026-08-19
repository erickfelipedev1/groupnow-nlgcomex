import { calcular, type Metricas } from "./metrics";
import { carregarPainel } from "./store.server";

/** O painel é do Brasil; o servidor pode estar em qualquer fuso. */
const TZ = "America/Sao_Paulo";

/** Ano do painel: `PAINEL_ANO` nos secrets, ou o ano corrente em São Paulo. */
export function anoDoPainel(): number {
  const doSecret = Number(process.env["PAINEL_ANO"]);
  if (doSecret) return doSecret;

  const partes = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, year: "numeric" }).formatToParts(
    new Date(),
  );
  return Number(partes.find((x) => x.type === "year")?.value ?? new Date().getFullYear());
}

export async function carregarMetricas(ano = anoDoPainel()): Promise<Metricas> {
  return calcular(await carregarPainel(ano));
}
