import Link from "next/link";
import { routes } from "@/lib/routing";
import { DEFAULT_WORK_SLUG } from "@/lib/env";

const items = [
  { href: routes.admin.dashboard(), label: "Tauler" },
  { href: routes.admin.work(), label: "Obra" },
  { href: routes.admin.chapters(), label: "Capítols" },
  { href: routes.admin.vignettes(), label: "Vinyetes" },
  { href: routes.admin.media(), label: "Mediateca" },
  { href: routes.admin.settings(), label: "Configuració" },
] as const;

export function AdminNav() {
  return (
    <nav aria-label="Administració" className="flex flex-col gap-1 font-mono text-xs uppercase tracking-widest">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className="px-2 py-2 text-smoke hover:bg-ink-soft hover:text-paper">
          {item.label}
        </Link>
      ))}
      <hr className="my-3 border-line" />
      <Link href={routes.admin.preview(DEFAULT_WORK_SLUG)} className="px-2 py-2 text-smoke hover:bg-ink-soft hover:text-paper">
        Previsualitza l&apos;auca
      </Link>
      <Link href="/" className="px-2 py-2 text-smoke hover:bg-ink-soft hover:text-paper">
        Veure el lloc ↗
      </Link>
    </nav>
  );
}
