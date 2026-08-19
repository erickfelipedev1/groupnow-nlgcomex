import { createFileRoute } from "@tanstack/react-router";
import { traduzir } from "@/lib/painel/rdstation";
import { anoDoPainel } from "@/lib/painel/painel.server";
import { salvarNegocio } from "@/lib/painel/store.server";
import { safeEqual } from "@/lib/webhook-secret.server";

/**
 * Webhook do RD Station CRM.
 *
 * URL para cadastrar no RD:
 *   https://SEU-DOMINIO/api/public/rdstation-webhook?secret=RD_WEBHOOK_SECRET
 *
 * O setor sai do funil do negócio (MAPA_FUNIL em src/lib/painel/config.ts).
 * `&setor=transporte` força o setor; `&dry=1` só mostra a interpretação do
 * payload, sem gravar nada.
 */
export const Route = createFileRoute("/api/public/rdstation-webhook")({
  server: {
    handlers: {
      // O RD pode sondar a URL antes de ativar a assinatura; responder 2xx é o
      // que mantém o webhook válido. Continua exigindo o segredo.
      GET: async ({ request }) => {
        const esperado = process.env["RD_WEBHOOK_SECRET"];
        const recebido =
          new URL(request.url).searchParams.get("secret") ??
          request.headers.get("x-webhook-secret") ??
          "";
        if (!esperado || !recebido || !safeEqual(recebido, esperado)) {
          return json({ erro: "não autorizado" }, 401);
        }
        return json({ ok: true, rota: "rdstation-webhook", metodo: "GET" });
      },
      POST: async ({ request }) => {
        const esperado = process.env["RD_WEBHOOK_SECRET"];
        if (!esperado) {
          console.error("[rdstation-webhook] RD_WEBHOOK_SECRET não configurado — recusando.");
          return json({ erro: "Server misconfigured" }, 500);
        }

        const url = new URL(request.url);
        // O RD manda o segredo na própria URL do webhook, não em header — os
        // headers seguem aceitos para testes com curl.
        const recebido =
          url.searchParams.get("secret") ?? request.headers.get("x-webhook-secret") ?? "";
        if (!recebido || !safeEqual(recebido, esperado)) {
          return json({ erro: "não autorizado" }, 401);
        }

        let corpo: unknown;
        try {
          corpo = await request.json();
        } catch {
          // Ao cadastrar a assinatura, o RD sonda a URL e só aceita se a
          // resposta for 2xx — essa sondagem não traz payload de negócio.
          // Responder 400 aqui faz o cadastro falhar com "401 Unauthorized",
          // que parece erro de token.
          console.warn("[rdstation-webhook] corpo não-JSON (provável validação do RD)");
          return json({ ok: true, validacao: true });
        }

        const t = traduzir(corpo, url.searchParams.get("setor"));
        if (!t.ok) {
          // 200 de propósito: é rejeição de regra de negócio, não falha de
          // entrega. O RD reenvia 5x em qualquer resposta fora do 2xx e
          // suspende a URL se os erros persistirem — um funil fora do mapa
          // derrubaria o webhook inteiro, inclusive para os que funcionam.
          console.warn("[rdstation-webhook] ignorado:", t.erro);
          return json({ ok: false, ignorado: t.erro, funil: t.funil });
        }

        if (url.searchParams.get("dry") === "1") {
          return json({ ok: true, simulacao: true, id: t.id, funil: t.funil, negocio: t.negocio });
        }

        const ano = anoDoPainel();
        if (t.ano !== ano) {
          return json({ ok: true, ignorado: `negócio de ${t.ano}, painel é ${ano}` });
        }

        try {
          await salvarNegocio(t.id, t.negocio, ano);
        } catch (e) {
          // Devolver 5xx faz o RD reenviar depois — melhor que perder o negócio.
          console.error("[rdstation-webhook] falha ao gravar:", e);
          return json({ erro: "falha ao gravar o negócio" }, 500);
        }

        return json({ ok: true, id: t.id, funil: t.funil, negocio: t.negocio });
      },
    },
  },
});

function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
