"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="contingut" className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 text-center">
      <p className="font-mono text-xs uppercase tracking-[var(--tracking-title)] text-smoke">Error</p>
      <p className="max-w-md text-2xl italic leading-snug">Alguna cosa s&apos;ha quedat a l&apos;ombra.</p>
      <button
        type="button"
        onClick={reset}
        className="font-mono text-xs uppercase tracking-[var(--tracking-title)] underline-offset-8 hover:underline"
      >
        Tornar-ho a provar
      </button>
    </main>
  );
}
