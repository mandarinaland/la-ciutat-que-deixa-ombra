import Link from "next/link";

/**
 * Pantalla serena per a les parts de l'obra que encara no tenen contingut connectat.
 * No mostra dades inventades: només diu on ets.
 */
export function QuietPage({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <main id="contingut" className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-24 text-center">
      {eyebrow ? (
        <p className="font-mono text-xs uppercase tracking-[var(--tracking-title)] text-smoke">{eyebrow}</p>
      ) : null}
      <h1 className="max-w-2xl text-3xl uppercase tracking-[var(--tracking-title)] sm:text-4xl">{title}</h1>
      {children ? <div className="max-w-md text-lg italic leading-relaxed text-smoke">{children}</div> : null}
      <Link
        href="/"
        className="font-mono text-xs uppercase tracking-[var(--tracking-title)] text-smoke underline-offset-8 hover:text-paper hover:underline"
      >
        ← Inici
      </Link>
    </main>
  );
}
