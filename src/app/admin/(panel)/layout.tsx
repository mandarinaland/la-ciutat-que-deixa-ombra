import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { MobileMenu } from "@/components/admin/MobileMenu";
import { requireAdmin } from "@/lib/auth/admin";

/**
 * Tot el que penja d'aquest layout exigeix un administrador.
 * (Recordatori: les Server Actions criden requireAdmin() pel seu compte.)
 */
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  const account = (
    <div className="border-t border-line pt-4">
      <p
        className="mb-2 truncate px-2 font-mono text-[11px] text-smoke"
        title={admin.email ?? undefined}
      >
        {admin.email} · {admin.role}
      </p>
      <LogoutButton />
    </div>
  );

  return (
    <div className="grid min-h-dvh grid-cols-1 md:grid-cols-[220px_1fr]">
      {/* Mòbil: barra compacta amb menú plegable */}
      <header className="relative flex items-center justify-between gap-4 border-b border-line px-4 py-3 md:hidden">
        <Link href="/admin/dashboard" className="leading-tight">
          La ciutat que deixa ombra
        </Link>
        <MobileMenu>
          <AdminNav />
          <div className="mt-4">{account}</div>
        </MobileMenu>
      </header>
      {/* Escriptori: barra lateral */}
      <aside className="hidden flex-col border-r border-line p-6 md:flex">
        <Link
          href="/admin/dashboard"
          className="mb-8 block text-lg leading-tight"
        >
          La ciutat
          <br />
          que deixa ombra
        </Link>
        <AdminNav />
        <div className="mt-auto pt-8">{account}</div>
      </aside>
      <main id="contingut" className="min-w-0 p-4 sm:p-6 md:p-10">
        {children}
      </main>
    </div>
  );
}
