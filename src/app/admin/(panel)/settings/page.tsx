import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const metadata: Metadata = { title: "Configuració" };

export default function SettingsAdminPage() {
  return (
    <AdminPlaceholder title="Configuració" phase={7}>
      Límits de pujada per tipus, obra per defecte i administradors.
    </AdminPlaceholder>
  );
}
