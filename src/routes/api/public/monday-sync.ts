import { createFileRoute } from "@tanstack/react-router";
import { interpretar, interpretarMargem, QUERY_METAS, QUERY_MARGEM } from "@/lib/painel/monday";
import { anoDoPainel } from "@/lib/painel/painel.server";
import { salvarMetas, substituirMargem, substituirRealizado } from "@/lib/painel/store.server";
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
  let respostaMargem: unknown;
  try {
    [resposta, respostaMargem] = await Promise.all([
      consultar(token, QUERY_METAS),
      consultar(token, QUERY_MARGEM),
    ]);
  } catch (e) {
    console.error("[monday-sync] falha ao consultar o monday:", e);
    return json({ erro: "falha ao consultar o monday", detalhe: String(e) }, 502);
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

  const margem = interpretarMargem(respostaMargem);

  const ano = anoDoPainel();
  const resumo = {
    ano,
    meses: leitura.linhas.length,
    metaGlobal: leitura.metaGlobal,
    metasSetor: leitura.metasSetor,
    total: Number(leitura.linhas.reduce((s, l) => s + l.valor, 0).toFixed(2)),
    margem: {
      lancamentos: margem.linhas.length,
      unidades: [...new Set(margem.linhas.map((l) => l.unidade))],
    },
    ignorados: [...leitura.ignorados, ...margem.ignorados],
  };

  if (url.searchParams.get("dry") === "1") {
    return json({ ok: true, simulacao: true, ...resumo });
  }

  try {
    await salvarMetas(ano, leitura.metasSetor, leitura.metaGlobal);
    await substituirRealizado(ano, leitura.linhas);
    await substituirMargem(ano, margem.linhas);
  } catch (e) {
    console.error("[monday-sync] falha ao gravar:", e);
    return json({ erro: "falha ao gravar no banco" }, 500);
  }

  return json({ ok: true, ...resumo });
}

/** Uma consulta ao GraphQL do monday, com os erros dele tratados como falha. */
async function consultar(token: string, query: string): Promise<unknown> {
  const r = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!r.ok) throw new Error(`monday respondeu ${r.status}`);

  const corpo: unknown = await r.json();
  // O GraphQL devolve 200 mesmo com erro; o erro vem no corpo.
  const erros = (corpo as Record<string, unknown> | null)?.["errors"];
  if (erros) throw new Error(`monday recusou a consulta: ${JSON.stringify(erros).slice(0, 300)}`);

  return corpo;
}

function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
