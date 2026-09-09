import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { DEMO } from "@/lib/painel/demo";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  // Em demonstração o middleware sai de cena: ele chama supabase.auth
  // .getSession(), e o cliente lança quando falta credencial. O sintoma seria
  // a página inteira em branco, não um erro legível. Desligado aqui, em
  // arquivo nosso — os arquivos do integrations/ são gerados e sobrescritos.
  functionMiddleware: DEMO ? [] : [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));
