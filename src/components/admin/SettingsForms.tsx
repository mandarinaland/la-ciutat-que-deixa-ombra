"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/lib/data/errors";
import { addAdminAction, removeAdminAction, saveUploadLimitsAction } from "@/lib/actions/settings";
import { BUCKET_MAX_BYTES, type UploadLimits } from "@/lib/media/limits";
import { ConfirmSubmit, Field, FormFeedback, SubmitButton, inputClass, useActionForm } from "./ui";

const MB = 1024 * 1024;
const idle: ActionResult = { ok: true };

export function UploadLimitsForm({ limits }: { limits: UploadLimits }) {
  const { state, onSubmit, pending } = useActionForm(saveUploadLimitsAction);
  const fe = state.ok ? {} : (state.fieldErrors ?? {});
  const rows = [
    { key: "image", label: "Imatges" },
    { key: "audio", label: "Àudio" },
    { key: "video", label: "Vídeo" },
  ] as const;
  return (
    <form onSubmit={onSubmit} className="grid max-w-xl gap-5">
      <div className="grid gap-5 sm:grid-cols-3">
        {rows.map((r) => (
          <Field key={r.key} label={`${r.label} (MB)`} name={`limit-${r.key}`} error={fe[r.key]} hint={`Màxim del bucket: ${BUCKET_MAX_BYTES[r.key] / MB} MB`}>
            <input
              id={`limit-${r.key}`}
              name={r.key}
              type="number"
              min={1}
              step={1}
              max={BUCKET_MAX_BYTES[r.key] / MB}
              defaultValue={Math.round(limits[r.key].maxBytes / MB)}
              className={inputClass}
            />
          </Field>
        ))}
      </div>
      <div className="flex items-center gap-4">
        <SubmitButton pending={pending} pendingLabel="Desant…">
          Guardar límits
        </SubmitButton>
        <FormFeedback state={state} />
      </div>
    </form>
  );
}

export function AddAdminForm() {
  const [state, action] = useActionState(addAdminAction, idle);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <Field label="Correu d'un compte existent" name="admin-email">
        <input id="admin-email" name="email" type="email" required className={`${inputClass} w-72`} />
      </Field>
      <Field label="Rol" name="admin-role">
        <select id="admin-role" name="role" defaultValue="editor" className={`${inputClass} w-36`}>
          <option value="editor">Editor</option>
          <option value="owner">Owner</option>
        </select>
      </Field>
      <SubmitButton tone="ghost" pendingLabel="…">
        Donar accés
      </SubmitButton>
      <FormFeedback state={state} />
    </form>
  );
}

export function RemoveAdminForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(removeAdminAction, idle);
  return (
    <form action={action} className="flex items-center gap-3">
      <input type="hidden" name="user_id" value={userId} />
      <ConfirmSubmit label="Treure" confirmLabel="Confirmar" />
      <FormFeedback state={state} />
    </form>
  );
}
