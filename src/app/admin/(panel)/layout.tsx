import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { requireAdmin } from "@/lib/auth/admin";

/**
 * Tot el que penja d'aquest layout exigeix un administrador.
 * (Recordatori: les Server Actions criden requireAdmin() pel seu compte.)
 */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="grid min-h-dvh grid-cols-1 md:grid-cols-[220px_1fr]">
      <aside className="flex flex-col border-b border-line p-6 md:border-r md:border-b-0">
        <Link href="/admin/dashboard" className="mb-8 block text-lg leading-tight">
          La ciutat
          <br />
          que deixa ombra
        </Link>
        <AdminNav />
        <div className="mt-8 border-t border-line pt-4 md:mt-auto">
          <p className="mb-2 truncate px-2 font-mono text-[11px] text-smoke" title={admin.email ?? undefined}>
            {admin.email} · {admin.role}
          </p>
          <LogoutButton />
        </div>
      </aside>
      <main id="contingut" className="p-6 md:p-10">
        {children}
      </main>
    </div>
  );
}
