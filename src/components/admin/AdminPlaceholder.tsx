export function AdminPlaceholder({ title, phase, children }: { title: string; phase: number; children?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex items-baseline justify-between gap-4 border-b border-line pb-4">
        <h1 className="text-2xl">{title}</h1>
        <span className="font-mono text-[11px] uppercase tracking-widest text-smoke">Fase {phase}</span>
      </header>
      <div className="max-w-2xl font-mono text-sm leading-relaxed text-smoke">{children}</div>
    </section>
  );
}
