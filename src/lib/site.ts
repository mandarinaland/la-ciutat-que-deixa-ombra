/**
 * Identitat del lloc i URL canònica segons l'entorn.
 *
 * Els textos de l'obra (títol, subtítol, frase d'entrada, crèdits) viuen a la base de dades
 * (taula `works`). Aquí només hi ha el nom del lloc com a valor de reserva per a metadata
 * quan encara no hi ha connexió amb Supabase.
 */
export const siteConfig = {
  name: "La ciutat que deixa ombra",
  tagline: "Auca de David Teulats · Veu de Piath",
  locale: "ca_ES",
  lang: "ca",
  /** Enllaços discrets al peu de la web (altres projectes de Piath). */
  links: [
    { label: "La revista dels Xiuxiuejos de Piath", href: "https://piath.cat" },
    { label: "ARCA", href: "https://arca.chat" },
    { label: "RZO", href: "https://rzonodes.xyz" },
  ],
} as const;

/**
 * Ordre de preferència:
 * 1. NEXT_PUBLIC_SITE_URL (domini propi, definit a Vercel Production)
 * 2. VERCEL_PROJECT_PRODUCTION_URL (quan és producció sense domini propi)
 * 3. VERCEL_URL (cada Preview té la seva)
 * 4. localhost
 */
export function getSiteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);

  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }
  if (process.env.VERCEL_URL) return new URL(`https://${process.env.VERCEL_URL}`);

  return new URL(`http://localhost:${process.env.PORT ?? 3000}`);
}

/** Només producció s'indexa. Preview i local mai. */
export function isIndexable(): boolean {
  return process.env.VERCEL_ENV === "production";
}

export function absoluteUrl(path = "/"): string {
  return new URL(path, getSiteUrl()).toString();
}
