import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getPublicEnv } from "@/lib/env";

/**
 * Client de SERVIDOR amb la sessió de l'usuari (cookies).
 * Per a l'administració: totes les consultes passen per RLS amb la identitat de l'admin.
 *
 * Llegeix cookies → la ruta que el fa servir és dinàmica. Per a lectures públiques
 * cachejables, fes servir `createPublicClient()` de ./public.
 */
export async function createSupabaseServerClient() {
  // cookies() primer: marca la ruta com a dinàmica abans de res més.
  const cookieStore = await cookies();
  const env = getPublicEnv();

  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Des d'un Server Component no es poden escriure cookies.
          // No passa res: proxy.ts ja refresca la sessió a cada petició de /admin.
        }
      },
    },
  });
}
