import Link from "next/link";

export default function NotFound() {
  return (
    <main id="contingut" className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 text-center">
      <p className="font-mono text-xs uppercase tracking-[var(--tracking-title)] text-smoke">404</p>
      <p className="max-w-md text-2xl italic leading-snug">
        Aquest carrer no porta enlloc.
        <br />
        O porta a un lloc que encara no hem fotografiat.
      </p>
      <Link href="/" className="font-mono text-xs uppercase tracking-[var(--tracking-title)] underline-offset-8 hover:underline">
        Tornar a l&apos;inici
      </Link>
    </main>
  );
}
