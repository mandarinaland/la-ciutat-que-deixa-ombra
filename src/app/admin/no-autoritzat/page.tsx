import type { Metadata } from "next";
import { LogoutButton } from "@/components/admin/LogoutButton";

export const metadata: Metadata = { title: "Sense accés" };

export default function UnauthorizedPage() {
  return (
    <main id="contingut" className="flex min-h-dvh items-center justify-center px-6">
      <div className="flex w-full max-w-sm flex-col gap-6 border border-line p-8">
        <h1 className="text-2xl">Sense accés</h1>
        <p className="font-mono text-xs leading-relaxed text-smoke">
          Aquest compte ha iniciat sessió però no és administrador de l&apos;obra.
        </p>
        <LogoutButton />
      </div>
    </main>
  );
}
