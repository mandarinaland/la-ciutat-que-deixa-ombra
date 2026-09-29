"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/lib/data/errors";
import type { AdminChapter } from "@/lib/data/admin";
import { createChapterAction, deleteChapterAction, updateChapterAction } from "@/lib/actions/chapters";
import { ConfirmSubmit, Field, FormFeedback, SubmitButton, inputClass, useActionForm } from "./ui";

const idle: ActionResult = { ok: true };

export function ChapterEditForm({ chapter, workSlug }: { chapter: AdminChapter; workSlug: string }) {
  const { state, onSubmit, pending } = useActionForm(updateChapterAction);
  const [delState, delAction] = useActionState(deleteChapterAction, idle);
  const fe = state.ok ? {} : (state.fieldErrors ?? {});
  const p = `ch-${chapter.id}`;

  return (
    <div className="grid gap-5 pt-4 pb-2">
      <form onSubmit={onSubmit} className="grid gap-5">
        <input type="hidden" name="id" value={chapter.id} />
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Títol" name={`${p}-title`} error={fe.title}>
            <input id={`${p}-title`} name="title" defaultValue={chapter.title} required className={inputClass} />
          </Field>
          <Field label="Slug" name={`${p}-slug`} error={fe.slug} hint={`/auca/${workSlug}/${chapter.slug}`}>
            <input id={`${p}-slug`} name="slug" defaultValue={chapter.slug} required className={`${inputClass} font-mono`} />
          </Field>
        </div>
        <Field label="Descripció" name={`${p}-description`}>
          <textarea id={`${p}-description`} name="description" rows={3} defaultValue={chapter.description ?? ""} className={inputClass} />
        </Field>
        <Field label="Estat" name={`${p}-status`}>
          <select id={`${p}-status`} name="status" defaultValue={chapter.status} className={`${inputClass} max-w-xs`}>
            <option value="draft">Esborrany</option>
            <option value="published">Publicat</option>
            <option value="archived">Arxivat</option>
          </select>
        </Field>
        <div className="flex flex-wrap items-center gap-4">
          <SubmitButton pending={pending} pendingLabel="Desant…">Guardar</SubmitButton>
          <FormFeedback state={state} />
        </div>
      </form>
      <form action={delAction} className="flex flex-wrap items-center gap-4 border-t border-line pt-4">
        <input type="hidden" name="id" value={chapter.id} />
        <ConfirmSubmit label="Eliminar capítol" />
        <span className="font-mono text-[11px] text-smoke">
          {chapter.vignette_count > 0 ? `Les ${chapter.vignette_count} vinyetes quedaran sense capítol (no s'esborren).` : ""}
        </span>
        <FormFeedback state={delState} />
      </form>
    </div>
  );
}

export function CreateChapterForm({ workId }: { workId: string }) {
  const { state, onSubmit, pending } = useActionForm(createChapterAction);
  const fe = state.ok ? {} : (state.fieldErrors ?? {});
  return (
    <form onSubmit={onSubmit} className="grid max-w-xl gap-4">
      <input type="hidden" name="work_id" value={workId} />
      <Field label="Títol del capítol" name="new-chapter-title" error={fe.title}>
        <input id="new-chapter-title" name="title" required className={inputClass} />
      </Field>
      <Field label="Slug (opcional)" name="new-chapter-slug" error={fe.slug} hint="Si el deixes buit, es genera del títol.">
        <input id="new-chapter-slug" name="slug" className={`${inputClass} font-mono`} />
      </Field>
      <div className="flex items-center gap-4">
        <SubmitButton tone="ghost" pending={pending} pendingLabel="Creant…">Crear capítol</SubmitButton>
        <FormFeedback state={state} />
      </div>
    </form>
  );
}
