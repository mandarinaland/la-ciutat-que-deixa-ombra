import { z } from "zod";

/**
 * Variables PÚBLIQUES (arriben al navegador).
 * S'han de llegir amb `process.env.NEXT_PUBLIC_*` literal perquè Next.js les incrusti al build.
 * La validació és mandrosa: el build no falla si encara no hi ha Supabase configurat,
 * però qualsevol codi que les necessiti rep un error clar.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ message: "NEXT_PUBLIC_SUPABASE_URL ha de ser una URL" }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, "Falta NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  NEXT_PUBLIC_DEFAULT_WORK_SLUG: z.string().min(1).default("la-ciutat-que-deixa-ombra"),
});

export type PublicEnv = z.infer<typeof publicSchema>;

let cached: PublicEnv | undefined;

export function getPublicEnv(): PublicEnv {
  if (cached) return cached;
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_DEFAULT_WORK_SLUG: process.env.NEXT_PUBLIC_DEFAULT_WORK_SLUG || undefined,
  });
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  · ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(
      `Variables d'entorn públiques invàlides:\n${issues}\nRevisa .env.local o Vercel → Settings → Environment Variables.`,
    );
  }
  cached = parsed.data;
  return cached;
}

/** Cert si Supabase està configurat (útil per mostrar avisos en lloc de petar). */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export const DEFAULT_WORK_SLUG = process.env.NEXT_PUBLIC_DEFAULT_WORK_SLUG || "la-ciutat-que-deixa-ombra";
