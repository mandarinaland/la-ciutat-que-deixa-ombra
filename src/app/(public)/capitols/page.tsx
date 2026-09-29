import type { Metadata } from "next";
import { QuietPage } from "@/components/public/QuietPage";

export const metadata: Metadata = { title: "Capítols", alternates: { canonical: "/capitols" } };

/** FASE 11: índex de capítols publicats de l'obra per defecte. */
export default function ChaptersPage() {
  return <QuietPage eyebrow="Índex" title="Capítols" />;
}
