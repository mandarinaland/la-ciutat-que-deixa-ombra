import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getPublicEnv } from "@/lib/env";

/**
 * Client ANÒNIM sense cookies, per a l'experiència pública.
 * No depèn de la petició → les pàgines es poden generar estàticament i revalidar (ISR).
 * La RLS garanteix que només retorna contingut publicat.
 */
let publicClient: ReturnType<typeof createClient<Database>> | undefined;

export function createPublicClient() {
  if (publicClient) return publicClient;
  const env = getPublicEnv();
  publicClient = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return publicClient;
}
