"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/lib/actions/auth";

const initial: LoginState = { error: null, email: "" };

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="next" value={next} />

      <label className="flex flex-col gap-2">
        <span className="font-mono text-[11px] uppercase tracking-widest text-smoke">Correu</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          className="border border-line bg-ink-soft px-3 py-2 text-paper outline-none focus:border-paper"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="font-mono text-[11px] uppercase tracking-widest text-smoke">Contrasenya</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className="border border-line bg-ink-soft px-3 py-2 text-paper outline-none focus:border-paper"
        />
      </label>

      <p role="alert" aria-live="polite" className="min-h-5 font-mono text-xs text-ember">
        {state.error}
      </p>

      <button
        type="submit"
        disabled={pending}
        className="border border-paper/60 px-4 py-3 font-mono text-xs uppercase tracking-[0.25em] transition-colors hover:bg-paper hover:text-ink disabled:opacity-50"
      >
        {pending ? "Entrant…" : "Entrar"}
      </button>
    </form>
  );
}
