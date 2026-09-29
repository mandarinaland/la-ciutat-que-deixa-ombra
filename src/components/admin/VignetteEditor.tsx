"use client";

import { useActionState, useRef } from "react";
import type { ActionResult } from "@/lib/data/errors";
import type { AdminVignette } from "@/lib/data/admin";
import { deleteVignetteAction, saveVignetteAction } from "@/lib/actions/vignettes";
import { ConfirmSubmit, Field, FormFeedback, SubmitButton, StatusBadge, buttonClass, inputClass, labelClass, useActionForm } from "./ui";

const idle: ActionResult = { ok: true };

type Props = {
  vignette: Omit<AdminVignette, "media">;
  chapters: { id: string; title: string }[];
  previewHref: string;
  /** Ranures multimèdia (fora del formulari: cada una té les seves accions). */
  mediaPanel: React.ReactNode;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-line pt-6">
      <h2 className={labelClass}>{title}</h2>
      {children}
    </section>
  );
}

export function VignetteEditor({ vignette, chapters, previewHref, mediaPanel }: Props) {
  const { state, onSubmit, pending, intent } = useActionForm(saveVignetteAction);
  const [delState, delAction] = useActionState(deleteVignetteAction, idle);
  const formRef = useRef<HTMLFormElement>(null);
  const fe = state.ok ? {} : (state.fieldErrors ?? {});
  const isPublished = vignette.status === "published";
  const isArchived = vignette.status === "archived";
  const btn = { pending, activeIntent: intent ?? "save" };

  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-start">
      <div className="grid gap-8">{mediaPanel}</div>
      <div className="grid gap-8">
      <form
        ref={formRef}
        onSubmit={onSubmit}
        className="grid gap-8"
        onKeyDown={(e) => {
          // Ctrl/Cmd + S → Guardar
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
            e.preventDefault();
            formRef.current?.requestSubmit();
          }
        }}
      >
        <input type="hidden" name="id" value={vignette.id} />

        <Section title="Text de Piath">
          <Field label="Text" name="piath_text" error={fe.piath_text}>
            <textarea
              id="piath_text"
              name="piath_text"
              rows={10}
              defaultValue={vignette.piath_text ?? ""}
              className={`${inputClass} font-serif text-xl leading-relaxed`}
              placeholder="Una ciutat no té una cara. En té milers."
            />
          </Field>
        </Section>

        <Section title="Metadades">
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Títol" name="title" error={fe.title}>
              <input id="title" name="title" defaultValue={vignette.title ?? ""} className={inputClass} />
            </Field>
            <Field label="Slug" name="slug" error={fe.slug} hint="Identificador intern; la URL pública fa servir el número.">
              <input id="slug" name="slug" defaultValue={vignette.slug} required className={`${inputClass} font-mono`} aria-invalid={!!fe.slug} />
            </Field>
            <Field label="Capítol" name="chapter_id" error={fe.chapter_id}>
              <select id="chapter_id" name="chapter_id" defaultValue={vignette.chapter_id ?? ""} className={inputClass}>
                <option value="">Sense capítol</option>
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Fotògraf" name="photographer" error={fe.photographer}>
              <input id="photographer" name="photographer" defaultValue={vignette.photographer ?? ""} className={inputClass} />
            </Field>
            <Field label="Data de la fotografia" name="photo_date" error={fe.photo_date}>
              <input id="photo_date" name="photo_date" type="date" defaultValue={vignette.photo_date ?? ""} className={inputClass} />
            </Field>
            <Field label="Lloc" name="location" error={fe.location}>
              <input id="location" name="location" defaultValue={vignette.location ?? ""} className={inputClass} placeholder="Vic, plaça Major" />
            </Field>
          </div>
          <Field label="Peu de foto" name="caption" error={fe.caption}>
            <textarea id="caption" name="caption" rows={2} defaultValue={vignette.caption ?? ""} className={inputClass} />
          </Field>
        </Section>

        <Section title="Estat">
          <div className="flex flex-wrap items-center gap-4">
            <StatusBadge status={vignette.status} />
            <p className="font-mono text-[11px] text-smoke">
              Publicar requereix una fotografia principal amb text alternatiu.
            </p>
          </div>
          {isArchived ? (
            <div>
              <SubmitButton name="intent" value="unarchive" tone="ghost" pendingLabel="…" {...btn}>
                Desarxivar (tornar a esborrany)
              </SubmitButton>
            </div>
          ) : (
            <div>
              <SubmitButton name="intent" value="archive" tone="ghost" pendingLabel="…" {...btn}>
                Arxivar
              </SubmitButton>
            </div>
          )}
        </Section>

        <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border-t border-line bg-ink/95 py-4 backdrop-blur">
          <SubmitButton name="intent" value="save" pendingLabel="Desant…" {...btn}>
            Guardar
          </SubmitButton>
          <a href={previewHref} target="_blank" rel="noopener" className={buttonClass("ghost")}>
            Previsualitzar ↗
          </a>
          {isPublished ? (
            <SubmitButton name="intent" value="unpublish" tone="ghost" pendingLabel="Retirant…" {...btn}>
              Despublicar
            </SubmitButton>
          ) : (
            <SubmitButton name="intent" value="publish" tone="ghost" pendingLabel="Publicant…" {...btn}>
              Publicar
            </SubmitButton>
          )}
          <FormFeedback state={state} />
          <span className="ml-auto hidden font-mono text-[10px] text-smoke/70 md:inline">⌘/Ctrl + S per guardar</span>
        </div>
      </form>

      <form action={delAction} className="flex flex-wrap items-center gap-4 border-t border-line pt-6">
        <input type="hidden" name="id" value={vignette.id} />
        <ConfirmSubmit label="Eliminar vinyeta" />
        <span className="font-mono text-[11px] text-smoke">Els fitxers es conserven a la mediateca.</span>
        <FormFeedback state={delState} />
      </form>
      </div>
    </div>
  );
}
