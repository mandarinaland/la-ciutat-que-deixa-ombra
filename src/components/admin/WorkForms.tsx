"use client";

import { useActionState } from "react";
import type { Tables } from "@/types/database";
import type { ActionResult } from "@/lib/data/errors";
import { createWorkAction, deleteWorkAction, updateWorkAction } from "@/lib/actions/work";
import { ConfirmSubmit, Field, FormFeedback, SubmitButton, inputClass, useActionForm } from "./ui";

const idle: ActionResult = { ok: true };

export function WorkForm({ work }: { work: Tables<"works"> }) {
  const { state, onSubmit, pending } = useActionForm(updateWorkAction);
  const fe = state.ok ? {} : (state.fieldErrors ?? {});

  return (
    <form onSubmit={onSubmit} className="grid max-w-3xl gap-6">
      <input type="hidden" name="id" value={work.id} />
      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Títol" name="title" error={fe.title}>
          <input id="title" name="title" defaultValue={work.title} required className={inputClass} aria-invalid={!!fe.title} />
        </Field>
        <Field label="Slug (URL)" name="slug" error={fe.slug} hint={`/auca/${work.slug}`}>
          <input id="slug" name="slug" defaultValue={work.slug} required className={`${inputClass} font-mono`} aria-invalid={!!fe.slug} />
        </Field>
      </div>
      <Field label="Subtítol" name="subtitle" error={fe.subtitle}>
        <input id="subtitle" name="subtitle" defaultValue={work.subtitle ?? ""} className={inputClass} />
      </Field>
      <Field label="Frase introductòria (portada)" name="intro_text" error={fe.intro_text}>
        <textarea id="intro_text" name="intro_text" rows={3} defaultValue={work.intro_text ?? ""} className={`${inputClass} font-serif text-lg`} />
      </Field>
      <Field
        label="Aforisme (portada, columna dreta)"
        name="hero_quote"
        error={fe.hero_quote}
        hint="La primera línia fa d'encapçalament; la resta és el text."
      >
        <textarea id="hero_quote" name="hero_quote" rows={4} defaultValue={work.hero_quote ?? ""} className={`${inputClass} font-serif text-lg`} />
      </Field>
      <Field label="Descripció (SEO i pàgina d'obra)" name="description" error={fe.description}>
        <textarea id="description" name="description" rows={5} defaultValue={work.description ?? ""} className={inputClass} />
      </Field>
      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Fotografies" name="credit_photography">
          <input id="credit_photography" name="credit_photography" defaultValue={work.credit_photography ?? ""} className={inputClass} />
        </Field>
        <Field label="Textos i veu" name="credit_text_voice">
          <input id="credit_text_voice" name="credit_text_voice" defaultValue={work.credit_text_voice ?? ""} className={inputClass} />
        </Field>
      </div>
      <Field label="Estat" name="status" hint="Mentre l'obra sigui un esborrany, el públic no en veu res.">
        <select id="status" name="status" defaultValue={work.status} className={inputClass}>
          <option value="draft">Esborrany</option>
          <option value="published">Publicada</option>
          <option value="archived">Arxivada</option>
        </select>
      </Field>
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton pending={pending} pendingLabel="Desant…">Guardar</SubmitButton>
        <FormFeedback state={state} />
      </div>
    </form>
  );
}

export function CreateWorkForm() {
  const { state, onSubmit, pending } = useActionForm(createWorkAction);
  const fe = state.ok ? {} : (state.fieldErrors ?? {});
  return (
    <form onSubmit={onSubmit} className="grid max-w-xl gap-4">
      <Field label="Títol de la nova obra" name="new-title" error={fe.title}>
        <input id="new-title" name="title" required className={inputClass} />
      </Field>
      <Field label="Slug (opcional)" name="new-slug" error={fe.slug} hint="Si el deixes buit, es genera del títol.">
        <input id="new-slug" name="slug" className={`${inputClass} font-mono`} />
      </Field>
      <div className="flex items-center gap-4">
        <SubmitButton tone="ghost" pending={pending} pendingLabel="Creant…">Crear obra</SubmitButton>
        <FormFeedback state={state} />
      </div>
    </form>
  );
}

export function DeleteWorkForm({ work }: { work: Pick<Tables<"works">, "id" | "slug"> }) {
  const [state, action] = useActionState(deleteWorkAction, idle);
  return (
    <form action={action} className="grid max-w-xl gap-4">
      <input type="hidden" name="id" value={work.id} />
      <p className="font-mono text-xs leading-relaxed text-smoke">
        S&apos;eliminaran l&apos;obra, els seus capítols i les seves vinyetes. Els fitxers es conserven a la mediateca.
      </p>
      <Field label={`Escriu «${work.slug}» per confirmar`} name="confirm">
        <input id="confirm" name="confirm" autoComplete="off" className={`${inputClass} font-mono`} />
      </Field>
      <div className="flex items-center gap-4">
        <ConfirmSubmit label="Eliminar l'obra" />
        <FormFeedback state={state} />
      </div>
    </form>
  );
}
