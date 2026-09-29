/** Server-safe: es pot fer servir des de qualsevol component. */
export function StatusBadge({ status, gender = "f" }: { status: "draft" | "published" | "archived"; gender?: "f" | "m" }) {
  // Símbol + text: l'estat no depèn només del color.
  const map = {
    published: { label: gender === "f" ? "Publicada" : "Publicat", symbol: "●", cls: "text-paper border-paper/50" },
    draft: { label: "Esborrany", symbol: "○", cls: "text-smoke border-line" },
    archived: { label: gender === "f" ? "Arxivada" : "Arxivat", symbol: "◌", cls: "text-smoke/70 border-line" },
  } as const;
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${s.cls}`}>
      <span aria-hidden>{s.symbol}</span>
      {s.label}
    </span>
  );
}
