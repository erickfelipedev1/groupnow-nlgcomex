import { createFileRoute } from "@tanstack/react-router";
import { carregarMetricas } from "@/lib/painel/painel.server";

/**
 * Métricas já calculadas, em JSON — é o que a tela consome.
 *
 * Alternativa: chamar `carregarMetricas()` direto no loader da rota do painel
 * e pular o fetch. Esta rota existe para a tela poder recarregar sozinha (o
 * painel fica numa TV) e para conferir os números por fora.
 */
export const Route = createFileRoute("/api/public/painel")({
  server: {
    handlers: {
      GET: async () => {
        const metricas = await carregarMetricas();
        return new Response(JSON.stringify(metricas), {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
