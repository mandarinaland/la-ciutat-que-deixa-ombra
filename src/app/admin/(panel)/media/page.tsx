import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const metadata: Metadata = { title: "Mediateca" };

export default function MediaAdminPage() {
  return (
    <AdminPlaceholder title="Mediateca" phase={7}>
      Imatges, àudios i vídeos: miniatura, nom, mida, tipus, durada, data i ús. Cercar, eliminar i reutilitzar.
    </AdminPlaceholder>
  );
}
