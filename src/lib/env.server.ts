import "server-only";
import { z } from "zod";

/**
 * Variables SECRETES. Aquest mòdul importa "server-only":
 * si algun component de client l'importa, el build falla. Així la
 * SUPABASE_SERVICE_ROLE_KEY no pot acabar mai dins del bundle del navegador.
 */
const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, "Falta SUPABASE_SERVICE_ROLE_KEY"),
  REVALIDATE_SECRET: z.string().min(16).optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    REVALIDATE_SECRET: process.env.REVALIDATE_SECRET || undefined,
  });
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  · ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Variables d'entorn de servidor invàlides:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
