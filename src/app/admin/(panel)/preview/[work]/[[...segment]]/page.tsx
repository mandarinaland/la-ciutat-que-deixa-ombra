import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";
import { isValidSlug } from "@/lib/routing";

export const metadata: Metadata = { title: "Previsualització" };

type Props = { params: Promise<{ work: string; segment?: string[] }> };

/**
 * Previsualització amb esborranys inclosos. Reutilitzarà exactament els components públics
 * de l'auca (FASE 12), però llegint amb la sessió d'administrador.
 */
export default async function PreviewPage({ params }: Props) {
  const { work, segment } = await params;
  if (!isValidSlug(work) || (segment && segment.length > 1)) notFound();
  return (
    <AdminPlaceholder title="Previsualitza l'auca" phase={12}>
      Obra: {work}
      {segment?.[0] ? ` · ${segment[0]}` : ""}
    </AdminPlaceholder>
  );
}
