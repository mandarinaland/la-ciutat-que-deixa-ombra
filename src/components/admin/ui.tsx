"use client";

import { startTransition, useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionResult } from "@/lib/data/errors";
import { buttonClass, labelClass, type ButtonTone } from "./styles";

export { buttonClass, inputClass, labelClass } from "./styles";
export { StatusBadge } from "./StatusBadge";

export function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className={labelClass}>
        {label}
      </label>
      {children}
      {hint && !error ? <p className="font-mono text-[11px] text-smoke/80">{hint}</p> : null}
      {error ? (
        <p id={`${name}-error`} className="font-mono text-[11px] text-ember">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Formulari amb Server Action SENSE el reinici automàtic de React 19:
 * si el servidor retorna un error, el text escrit no es perd.
 * Inclou el botó que ha enviat el formulari (name/value → "intent").
 */
export function useActionForm(action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>) {
  const [state, dispatch, pending] = useActionState(action, { ok: true } as ActionResult);
  const [intent, setIntent] = useState<string | null>(null);
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const formData = new FormData(event.currentTarget, submitter);
    setIntent(submitter?.value ?? null);
    startTransition(() => dispatch(formData));
  };
  return { state, onSubmit, pending, intent };
}

/** Botó d'enviament que es desactiva mentre el formulari s'està enviant. */
export function SubmitButton({
  children,
  tone = "primary",
  name,
  value,
  pendingLabel,
  pending: pendingProp,
  activeIntent,
}: {
  children: React.ReactNode;
  tone?: ButtonTone;
  name?: string;
  value?: string;
  pendingLabel?: string;
  /** Si el formulari fa servir useActionForm, passa-hi `pending` i `intent`. */
  pending?: boolean;
  activeIntent?: string | null;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  const isThis =
    pending && (!name || (pendingProp !== undefined ? activeIntent === value : status.data?.get(name) === value));
  return (
    <button type="submit" name={name} value={value} disabled={pending} className={buttonClass(tone)}>
      {isThis && pendingLabel ? pendingLabel : children}
    </button>
  );
}

/** Missatge d'estat d'un formulari (anunciat als lectors de pantalla). */
export function FormFeedback({ state }: { state: ActionResult | undefined }) {
  if (!state || (state.ok && !state.message)) return <p role="status" aria-live="polite" className="sr-only" />;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      aria-live="polite"
      className={`font-mono text-xs ${state.ok ? "text-smoke" : "text-ember"}`}
    >
      {state.ok ? `✓ ${state.message}` : `✕ ${state.error}`}
    </p>
  );
}

/**
 * Eliminació en dos passos, sense diàlegs del navegador:
 * primer clic → "Segur?", segon clic → envia.
 */
export function ConfirmSubmit({ label, confirmLabel = "Confirmar eliminació" }: { label: string; confirmLabel?: string }) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();
  if (!armed) {
    return (
      <button type="button" onClick={() => setArmed(true)} className={buttonClass("danger")}>
        {label}
      </button>
    );
  }
  return (
    <span className="inline-flex gap-2">
      <button type="submit" disabled={pending} className={buttonClass("danger")} autoFocus>
        {pending ? "…" : confirmLabel}
      </button>
      <button type="button" onClick={() => setArmed(false)} className={buttonClass("ghost")}>
        Cancel·lar
      </button>
    </span>
  );
}

