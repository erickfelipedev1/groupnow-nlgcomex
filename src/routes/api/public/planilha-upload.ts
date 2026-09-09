import { createFileRoute } from "@tanstack/react-router";
import { DEMO } from "@/lib/painel/demo";

/**
 * Recebe uma planilha .xlsx atualizada e substitui o realizado do ano.
 *
 * POST multipart/form-data, campo "arquivo", protegido por
 * PLANILHA_UPLOAD_SECRET em ?secret= ou no header x-upload-secret.
 *
 * `&dry=1` mostra o que mudaria sem gravar. Se nada mudou desde a última
 * carga, a rota não grava — só avisa.
 */
export const Route = createFileRoute("/api/public/planilha-upload")({
  server: {
    handlers: {
      POST: async ({ request }) => enviar(request),
    },
  },
});

/** A planilha real tem ~100 KB; isso é folga para crescer sem abrir espaço a abuso. */
const TAMANHO_MAXIMO = 8 * 1024 * 1024;

const MESES_CURTOS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

async function enviar(request: Request): Promise<Response> {
  // Em demonstração a rota não existe, e os imports de integração ficam atrás
  // deste retorno: como DEMO vira constante em tempo de build, o bundler
  // descarta o resto — nenhum código de banco entra no pacote público.
  if (DEMO) return new Response("Not found", { status: 404 });

  const { anoDoPainel } = await import("@/lib/painel/painel.server");
  const { lerPlanilha } = await import("@/lib/painel/planilha");
  const { carregarPainel, substituirRealizado } = await import("@/lib/painel/store.server");
  const { safeEqual } = await import("@/lib/webhook-secret.server");
  const { SETORES } = await import("@/lib/painel/config");

  const segredo = process.env["PLANILHA_UPLOAD_SECRET"];
  if (!segredo) {
    console.error("[planilha-upload] falta PLANILHA_UPLOAD_SECRET nos secrets.");
    return json({ erro: "Server misconfigured" }, 500);
  }

  const url = new URL(request.url);
  const recebido = url.searchParams.get("secret") ?? request.headers.get("x-upload-secret") ?? "";
  if (!recebido || !safeEqual(recebido, segredo)) {
    return json({ erro: "não autorizado" }, 401);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ erro: "corpo inválido — mande multipart/form-data com o arquivo" }, 400);
  }

  const arquivo = form.get("arquivo");
  if (!(arquivo instanceof File)) {
    return json({ erro: 'faltou o arquivo (campo "arquivo")' }, 400);
  }
  if (arquivo.size === 0) {
    return json({ erro: "arquivo vazio" }, 400);
  }
  if (arquivo.size > TAMANHO_MAXIMO) {
    return json(
      { erro: `arquivo grande demais (${(arquivo.size / 1024 / 1024).toFixed(1)} MB)` },
      400,
    );
  }

  let leitura: Awaited<ReturnType<typeof lerPlanilha>>;
  try {
    const bytes = await arquivo.arrayBuffer();
    leitura = lerPlanilha(bytes);
  } catch (e) {
    console.error("[planilha-upload] falha ao ler o arquivo:", e);
    return json({ erro: e instanceof Error ? e.message : "não consegui ler o arquivo" }, 400);
  }

  const ano = anoDoPainel();

  // Compara com o que já está gravado antes de escrever, para devolver o que
  // mudou — a mesma conferência que era feita à mão a cada atualização.
  const mudancas: { setor: string; mes: string; de: number; para: number }[] = [];
  try {
    const atual = await carregarPainel(ano);
    for (const s of SETORES) {
      for (let i = 0; i < 12; i++) {
        const de = atual.realizado[s.id]?.[i] ?? 0;
        const para = leitura.serie[s.id][i] ?? 0;
        if (Math.abs(de - para) > 0.01) {
          mudancas.push({ setor: s.nome, mes: MESES_CURTOS[i]!, de, para });
        }
      }
    }
  } catch (e) {
    // Não bloqueia a gravação por isto — só perde o diff.
    console.error("[planilha-upload] falha ao ler o estado atual para comparar:", e);
  }

  const total = Number(leitura.linhas.reduce((s, l) => s + l.valor, 0).toFixed(2));
  const resumo = { ano, meses: leitura.linhas.length, total, mudancas, avisos: leitura.avisos };

  if (url.searchParams.get("dry") === "1") {
    return json({ ok: true, simulacao: true, ...resumo });
  }

  if (mudancas.length === 0) {
    return json({ ok: true, semMudanca: true, ...resumo });
  }

  try {
    await substituirRealizado(ano, leitura.linhas);
  } catch (e) {
    console.error("[planilha-upload] falha ao gravar:", e);
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
