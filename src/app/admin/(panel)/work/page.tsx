import type { Metadata } from "next";
import { getCurrentWork, listWorks } from "@/lib/data/admin";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { selectWorkAction } from "@/lib/actions/work";
import { CreateWorkForm, DeleteWorkForm, WorkForm } from "@/components/admin/WorkForms";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MediaSlot } from "@/components/admin/media/MediaSlot";
import { getUploadLimits } from "@/lib/data/settings";
import { resolveMediaSources } from "@/lib/media/sources";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MEDIA_FIELDS } from "@/lib/data/types";

export const metadata: Metadata = { title: "Obra" };

export default async function WorkAdminPage() {
  const [works, current, admin, limits] = await Promise.all([listWorks(), getCurrentWork(), getCurrentAdmin(), getUploadLimits()]);

  // Portada de l'obra
  let cover = null;
  if (current?.cover_media_id) {
    const supabase = await createSupabaseServerClient();
    const { data: m } = await supabase.from("media").select(MEDIA_FIELDS).eq("id", current.cover_media_id).maybeSingle();
    if (m) {
      const src = (await resolveMediaSources([m], "admin")).get(m.id);
      cover = { media: m, url: src?.url ?? null, stable: src?.kind === "file" ? src.stable !== false : true };
    }
  }

  return (
    <section className="flex flex-col gap-12">
      <header className="border-b border-line pb-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-smoke">Obra</p>
        <h1 className="text-3xl">{current?.title ?? "Cap obra"}</h1>
      </header>

      {current ? (
        <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-start">
          <WorkForm key={current.id} work={current} />
          <MediaSlot
            title="Imatge de portada"
            kind="image"
            target={{ type: "cover", workId: current.id }}
            current={cover}
            limits={limits}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        <h2 className="font-mono text-[11px] uppercase tracking-widest text-smoke">Totes les obres</h2>
        <ul className="divide-y divide-line border-y border-line">
          {works.map((w) => (
            <li key={w.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <span className="text-lg">{w.title}</span>
                <span className="font-mono text-xs text-smoke">/{w.slug}</span>
                <StatusBadge status={w.status} />
              </div>
              {w.id === current?.id ? (
                <span className="font-mono text-[11px] uppercase tracking-widest text-smoke">En edició</span>
              ) : (
                <form action={selectWorkAction}>
                  <input type="hidden" name="id" value={w.id} />
                  <button type="submit" className="font-mono text-[11px] uppercase tracking-widest text-smoke underline-offset-4 hover:text-paper hover:underline">
                    Treballar amb aquesta
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
        <details className="mt-2">
          <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-widest text-smoke hover:text-paper">
            + Nova obra
          </summary>
          <div className="pt-6">
            <CreateWorkForm />
          </div>
        </details>
      </div>

      {current && admin?.role === "owner" ? (
        <details className="border-t border-line pt-6">
          <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-widest text-ember">Zona perillosa</summary>
          <div className="pt-6">
            <DeleteWorkForm work={current} />
          </div>
        </details>
      ) : null}
    </section>
  );
}
