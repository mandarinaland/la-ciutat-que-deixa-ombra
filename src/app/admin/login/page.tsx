import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "Accés" };

type Props = { searchParams: Promise<{ next?: string | string[] }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const target = typeof next === "string" ? next : "/admin/dashboard";

  return (
    <main id="contingut" className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="mb-10 text-center text-lg leading-tight">
          La ciutat
          <br />
          que deixa ombra
        </p>
        <div className="border border-line p-8">
          <h1 className="mb-6 font-mono text-xs uppercase tracking-[var(--tracking-title)] text-smoke">Administració</h1>
          <LoginForm next={target} />
        </div>
      </div>
    </main>
  );
}
