import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const metadata: Metadata = { title: "Vinyetes" };

export default function VignettesAdminPage() {
  return (
    <AdminPlaceholder title="Vinyetes" phase={10}>
      Llista 01, 02, 03… amb arrossegar-i-deixar per reordenar (order_index a PostgreSQL).
    </AdminPlaceholder>
  );
}
