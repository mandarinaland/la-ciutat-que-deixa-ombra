import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";

/**
 * Layout del panell.
 * FASE 3: aquí es cridarà `await requireAdmin()` (sessió Supabase + fila a `admins`).
 * Fins llavors, `src/proxy.ts` bloqueja /admin a Vercel Production.
 */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-cols-1 md:grid-cols-[220px_1fr]">
      <aside className="border-b border-line p-6 md:border-r md:border-b-0">
        <Link href="/admin/dashboard" className="mb-8 block text-lg leading-tight">
          La ciutat
          <br />
          que deixa ombra
        </Link>
        <AdminNav />
      </aside>
      <main id="contingut" className="p-6 md:p-10">
        {children}
      </main>
    </div>
  );
}
