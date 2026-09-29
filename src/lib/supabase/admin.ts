import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getPublicEnv } from "@/lib/env";
import { getServerEnv } from "@/lib/env.server";

/**
 * Client amb SERVICE ROLE: ignora la RLS.
 *
 * ⚠ Només per a tasques de sistema que no es poden fer amb la sessió de l'admin
 *   (p. ex. netejar objectes orfes de Storage). Mai per a CRUD normal.
 *   Qui el cridi ha d'haver executat abans `requireAdmin()`.
 *
 * "server-only" fa fallar el build si algun component de client l'importa.
 */
export function createSupabaseServiceClient() {
  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv();
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();
  return createClient<Database>(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
