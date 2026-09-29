import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const metadata: Metadata = { title: "Obra" };

export default function WorkAdminPage() {
  return (
    <AdminPlaceholder title="Obra" phase={4}>
      Títol, subtítol, frase introductòria, crèdits, portada i estat de publicació.
    </AdminPlaceholder>
  );
}
