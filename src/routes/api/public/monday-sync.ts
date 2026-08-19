import { createFileRoute } from "@tanstack/react-router";
import { interpretar, QUERY_METAS } from "@/lib/painel/monday";
import { anoDoPainel } from "@/lib/painel/painel.server";
import { salvarMetas, substituirRealizado } from "@/lib/painel/store.server";
import { safeEqual } from "@/lib/webhook-secret.server";

/**
 * Sincroniza o painel com o quadro "Metas do Grupo Now" do monday.com.
 *
 * Feito para ser chamado por cron externo:
 *   GET https://SEU-DOMINIO/api/public/monday-sync?secret=PAINEL_SYNC_SECRET
 *
 * `&dry=1` mostra o que seria gravado sem gravar. Rodar de novo é seguro: a
 * gravação substitui o ano inteiro pelo que está no quadro.
 */
export const Route = createFileRoute("/api/public/monday-sync")({
  server: {
    handlers: {
      GET: async ({ request }) => sincronizar(request),
      POST: async ({ request }) => sincronizar(request),
    },
  },
});

async function sincronizar(request: Request): Promise<Response> {
  const segredo = process.env["PAINEL_SYNC_SECRET"];
  const token = process.env["MONDAY_TOKEN"];

  if (!segredo || !token) {
    console.error("[monday-sync] faltam PAINEL_SYNC_SECRET / MONDAY_TOKEN nos secrets.");
    return json({ erro: "Server misconfigured" }, 500);
  }

  const url = new URL(request.url);
  const recebido = url.searchParams.get("secret") ?? request.headers.get("x-sync-secret") ?? "";
  if (!recebido || !safeEqual(recebido, segredo)) {
    return json({ erro: "não autorizado" }, 401);
  }

  let resposta: unknown;
  try {
    const r = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { Authorization: token, "Content-Type": "application/json" },
      body: JSON.stringify({ query: QUERY_METAS }),
    });
    if (!r.ok) {
      return json({ erro: `monday respondeu ${r.status}` }, 502);
    }
    resposta = await r.json();
  } catch (e) {
    console.error("[monday-sync] falha ao consultar o monday:", e);
    return json({ erro: "falha ao consultar o monday" }, 502);
  }

  // O GraphQL devolve 200 mesmo com erro; o erro vem no corpo.
  const erros = (resposta as Record<string, unknown> | null)?.["errors"];
  if (erros) {
    console.error("[monday-sync] GraphQL devolveu erros:", JSON.stringify(erros).slice(0, 400));
    return json({ erro: "monday recusou a consulta", detalhe: erros }, 502);
  }

  const leitura = interpretar(resposta);
  if (leitura.linhas.length === 0) {
    // Não apagamos nada: quadro vazio é mais provável ser falha de leitura que
    // um ano inteiro sem faturamento.
    return json(
      {
        ok: false,
        erro: "o quadro não devolveu nenhum mês com faturamento",
        ignorados: leitura.ignorados,
      },
      422,
    );
  }

  const ano = anoDoPainel();
  const resumo = {
    ano,
    meses: leitura.linhas.length,
    metaGlobal: leitura.metaGlobal,
    metasSetor: leitura.metasSetor,
    total: Number(leitura.linhas.reduce((s, l) => s + l.valor, 0).toFixed(2)),
    ignorados: leitura.ignorados,
  };

  if (url.searchParams.get("dry") === "1") {
    return json({ ok: true, simulacao: true, ...resumo });
  }

  try {
    await salvarMetas(ano, leitura.metasSetor, leitura.metaGlobal);
    await substituirRealizado(ano, leitura.linhas);
  } catch (e) {
    console.error("[monday-sync] falha ao gravar:", e);
    return json({ erro: "falha ao gravar no banco" }, 500);
  }

  return json({ ok: true, ...resumo });
}

function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
