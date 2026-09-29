import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const metadata: Metadata = { title: "Capítols" };

export default function ChaptersAdminPage() {
  return (
    <AdminPlaceholder title="Capítols" phase={6}>
      Crear, editar, eliminar i reordenar capítols.
    </AdminPlaceholder>
  );
}
