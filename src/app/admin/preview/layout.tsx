import Link from "next/link";
import { AmbientProvider } from "@/components/auca/Ambient";
import { requireAdmin } from "@/lib/auth/admin";

/**
 * Previsualització: exactament la mateixa experiència pública, però amb esborranys.
 * Fora del panell (sense barra lateral) perquè es vegi tal com la veurà el públic.
 */
export default async function PreviewLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="relative min-h-dvh bg-ink font-serif">
      <AmbientProvider>{children}</AmbientProvider>
      <div className="fixed right-3 top-3 z-40 flex items-center gap-3 border border-ember/60 bg-ink/90 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-ember backdrop-blur sm:right-auto sm:left-1/2 sm:-translate-x-1/2">
        <span>Previsualització · inclou esborranys</span>
        <Link href="/admin/vignettes" className="text-paper underline-offset-4 hover:underline">
          Tornar a l&apos;admin
        </Link>
      </div>
    </div>
  );
}
