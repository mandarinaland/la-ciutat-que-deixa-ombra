import "server-only";
import type { Metadata } from "next";
import { excerpt, type Landing, type ReaderVignette } from "./auca";
import { formatVignetteNumber } from "@/lib/routing";
import { absoluteUrl } from "@/lib/site";

/** Metadades (SEO + Open Graph) a partir del contingut real de l'obra. */
export function landingMetadata(l: Landing, canonical: string): Metadata {
  const description = excerpt(l.work.intro_text ?? l.work.description ?? l.work.subtitle, 180) || undefined;
  return {
    title: { absolute: l.work.subtitle ? `${l.work.title} — ${l.work.subtitle}` : l.work.title },
    description,
    alternates: { canonical },
    // La imatge per compartir la genera opengraph-image.tsx (URL estable, no caduca).
    openGraph: { type: "website", title: l.work.title, description, url: canonical },
    twitter: { card: "summary_large_image", title: l.work.title, description },
  };
}

export function vignetteMetadata(v: ReaderVignette, canonical: string): Metadata {
  const n = formatVignetteNumber(v.number, v.total);
  const title = v.title ? `${n} · ${v.title}` : `Vinyeta ${n}`;
  const description = excerpt(v.text, 180) || undefined;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: "article", title: `${title} — ${v.work.title}`, description, url: canonical },
    twitter: { card: "summary_large_image", title, description },
  };
}

const person = (name: string | null | undefined) => (name ? { "@type": "Person", name } : undefined);

/** schema.org de l'obra (portada). */
export function landingJsonLd(l: Landing, path: string): Record<string, unknown> {
  const url = absoluteUrl(path);
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": url,
    url,
    name: l.work.title,
    alternativeHeadline: l.work.subtitle ?? undefined,
    description: excerpt(l.work.intro_text ?? l.work.description, 300) || undefined,
    inLanguage: "ca",
    genre: "Auca",
    creator: [person(l.work.credit_photography), person(l.work.credit_text_voice)].filter(Boolean),
    dateModified: l.work.updated_at,
  };
}

/** schema.org d'una vinyeta: una fotografia amb text, part de l'obra. */
export function vignetteJsonLd(v: ReaderVignette, path: string, workPath: string): Record<string, unknown> {
  const url = absoluteUrl(path);
  return {
    "@context": "https://schema.org",
    "@type": "Photograph",
    "@id": url,
    url,
    name: v.title ?? `Vinyeta ${v.number}`,
    position: v.number,
    text: v.text ?? undefined,
    caption: v.caption ?? v.image?.alt ?? undefined,
    inLanguage: "ca",
    creator: person(v.photographer ?? v.work.credit_photography),
    contributor: person(v.work.credit_text_voice),
    dateCreated: v.photoDate ?? undefined,
    contentLocation: v.location ? { "@type": "Place", name: v.location } : undefined,
    isPartOf: { "@type": "CreativeWork", name: v.work.title, url: absoluteUrl(workPath) },
    dateModified: v.updatedAt,
  };
}
