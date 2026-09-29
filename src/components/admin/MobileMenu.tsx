"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** Menú plegable per a pantalles petites; es tanca sol en canviar de pàgina. */
export function MobileMenu({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    ref.current?.removeAttribute("open");
  }, [pathname]);
  return (
    <details ref={ref} className="group md:hidden">
      <summary className="cursor-pointer list-none border border-line px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-smoke hover:text-paper [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">Menú</span>
        <span className="hidden group-open:inline">Tancar</span>
      </summary>
      <div className="absolute inset-x-0 top-full z-30 border-b border-line bg-ink p-4 shadow-2xl">{children}</div>
    </details>
  );
}
