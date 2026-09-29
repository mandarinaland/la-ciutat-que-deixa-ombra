import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const metadata: Metadata = { title: "Editor de vinyeta" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = { params: Promise<{ id: string }> };

export default async function VignetteEditorPage({ params }: Props) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  return (
    <AdminPlaceholder title="Editor de vinyeta" phase={6}>
      Fotografia · Text de Piath · Àudio · Vídeo · Metadades · Estat — Guardar, Previsualitzar, Publicar, Despublicar, Eliminar.
    </AdminPlaceholder>
  );
}
