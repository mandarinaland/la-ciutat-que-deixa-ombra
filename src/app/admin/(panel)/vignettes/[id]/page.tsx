import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getVignette, getVignetteNeighbours, listChapters } from "@/lib/data/admin";
import { pickMedia } from "@/lib/data/types";
import { resolveMediaSources } from "@/lib/media/sources";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatVignetteNumber } from "@/lib/routing";
import { VignetteEditor } from "@/components/admin/VignetteEditor";
import { MediaSlot, type SlotMedia } from "@/components/admin/media/MediaSlot";
import { getUploadLimits } from "@/lib/data/settings";
import { ROLE_KIND, ROLE_LABEL, type MediaRole } from "@/lib/media/roles";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const metadata: Metadata = { title: "Editor de vinyeta" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = { params: Promise<{ id: string }> };

export default async function VignetteEditorPage({ params }: Props) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const vignette = await getVignette(id);
  if (!vignette) notFound();

  const supabase = await createSupabaseServerClient();
  const [chapters, neighbours, { data: work }] = await Promise.all([
    listChapters(vignette.work_id),
    getVignetteNeighbours(vignette.work_id, vignette.order_index),
    supabase.from("works").select("slug, title").eq("id", vignette.work_id).single(),
  ]);

  const SLOTS: MediaRole[] = ["main_image", "audio_piath", "ambient_audio", "video", "video_poster"];
  const picked = SLOTS.map((role) => ({ role, media: pickMedia(vignette.media, role) }));
  const [sources, limits] = await Promise.all([
    resolveMediaSources(
      picked.flatMap((p) => (p.media ? [p.media] : [])),
      "admin",
    ),
    getUploadLimits(),
  ]);
  const slot = (m: (typeof picked)[number]["media"]): SlotMedia | null => {
    if (!m) return null;
    const src = sources.get(m.id);
    return { media: m, url: src?.url ?? null, stable: src?.kind === "file" ? src.stable !== false : true };
  };

  const mediaPanel = picked.map(({ role, media: m }) => (
    <MediaSlot
      key={role}
      title={ROLE_LABEL[role]}
      kind={ROLE_KIND[role]}
      required={role === "main_image"}
      target={{ type: "vignette", vignetteId: vignette.id, role }}
      current={slot(m)}
      limits={limits}
    />
  ));

  const { media, ...plain } = vignette;
  void media;
  const number = formatVignetteNumber(vignette.number, vignette.total);

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
        <div>
          <Link href="/admin/vignettes" className="font-mono text-[11px] uppercase tracking-widest text-smoke hover:text-paper">
            ← Vinyetes · {work?.title}
          </Link>
          <h1 className="mt-2 flex flex-wrap items-baseline gap-4 text-3xl">
            <span className="font-mono tabular-nums">
              {number} <span className="text-smoke">/ {vignette.total}</span>
            </span>
            <span>{vignette.title || <em className="text-smoke">Sense títol</em>}</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge status={vignette.status} />
          <nav aria-label="Vinyetes veïnes" className="flex gap-2 font-mono text-xs">
            {neighbours.prevId ? (
              <Link href={`/admin/vignettes/${neighbours.prevId}`} className="border border-line px-3 py-1 text-smoke hover:text-paper">
                ← anterior
              </Link>
            ) : null}
            {neighbours.nextId ? (
              <Link href={`/admin/vignettes/${neighbours.nextId}`} className="border border-line px-3 py-1 text-smoke hover:text-paper">
                següent →
              </Link>
            ) : null}
          </nav>
        </div>
      </header>

      <VignetteEditor
        key={vignette.id}
        vignette={plain}
        chapters={chapters.map((c) => ({ id: c.id, title: c.title }))}
        previewHref={`/admin/preview/${work?.slug}/${vignette.number}`}
        mediaPanel={mediaPanel}
      />
    </section>
  );
}
