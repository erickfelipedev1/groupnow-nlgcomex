import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | undefined;

/**
 * Cliente com service role — só no servidor. As tabelas do painel estão com
 * RLS ligada e sem policy, então nada além deste cliente lê ou escreve nelas.
 */
export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  // Backend externo do painel tem prioridade; cai no Cloud gerado se não houver.
  const url = process.env["PAINEL_SUPABASE_URL"] || process.env["SUPABASE_URL"];
  const key =
    process.env["PAINEL_SUPABASE_SERVICE_ROLE_KEY"] || process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) {
    throw new Error("Faltam PAINEL_SUPABASE_URL / PAINEL_SUPABASE_SERVICE_ROLE_KEY nos secrets.");
  }

  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}
