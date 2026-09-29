import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const metadata: Metadata = { title: "Tauler" };

export default function DashboardPage() {
  return (
    <AdminPlaceholder title="Tauler" phase={5}>
      Obres, capítols, vinyetes, fotografies, àudios, vídeos, esborranys i publicades — comptats directament a PostgreSQL.
    </AdminPlaceholder>
  );
}
