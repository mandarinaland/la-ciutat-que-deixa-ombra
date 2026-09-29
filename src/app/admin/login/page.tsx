import type { Metadata } from "next";

export const metadata: Metadata = { title: "Accés" };

/** FASE 3: formulari de Supabase Auth (email + contrasenya) amb Server Action. */
export default function LoginPage() {
  return (
    <main id="contingut" className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm border border-line p-8">
        <h1 className="mb-2 text-2xl">Accés</h1>
        <p className="font-mono text-xs leading-relaxed text-smoke">
          L&apos;autenticació amb Supabase s&apos;activa a la Fase 3.
        </p>
      </div>
    </main>
  );
}
