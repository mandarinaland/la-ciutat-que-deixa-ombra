import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentWork, getDashboardStats } from "@/lib/data/admin";
import { formatBytes } from "@/lib/format";
import { createVignetteAction } from "@/lib/actions/vignettes";
import { buttonClass } from "@/components/admin/styles";

export const metadata: Metadata = { title: "Tauler" };

function Stat({ label, value, href }: { label: string; value: string | number; href?: string }) {
  const body = (
    <>
      <span className="font-mono text-3xl tabular-nums">{value}</span>
      <span className="font-mono text-[11px] uppercase tracking-widest text-smoke">{label}</span>
    </>
  );
  const cls = "flex flex-col gap-2 border border-line p-5";
  return href ? (
    <Link href={href} className={`${cls} transition-colors hover:border-paper/60`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export default async function DashboardPage() {
  const work = await getCurrentWork();
  const stats = await getDashboardStats(work?.id ?? null);

  return (
    <section className="flex flex-col gap-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-smoke">Tauler</p>
          <h1 className="text-3xl">{work?.title ?? "Cap obra"}</h1>
          {work ? (
            <p className="mt-1 font-mono text-xs text-smoke">
              Obra {work.status === "published" ? "publicada" : work.status === "draft" ? "en esborrany" : "arxivada"}
            </p>
          ) : null}
        </div>
        {work ? (
          <form action={createVignetteAction}>
            <input type="hidden" name="work_id" value={work.id} />
            <button type="submit" className={buttonClass()}>
              + Nova vinyeta
            </button>
          </form>
        ) : (
          <Link href="/admin/work" className={buttonClass()}>
            Crear una obra
          </Link>
        )}
      </header>

      {!process.env.SUPABASE_SERVICE_ROLE_KEY ? (
        <p role="note" className="border border-ember/50 p-4 font-mono text-xs leading-relaxed text-ember">
          Falta la variable SUPABASE_SERVICE_ROLE_KEY a Vercel. L&apos;administració funciona, però les miniatures
          es carreguen sense optimitzar. Afegeix-la a Settings → Environment Variables i torna a desplegar.
        </p>
      ) : null}

      <div>
        <h2 className="mb-4 font-mono text-[11px] uppercase tracking-widest text-smoke">Contingut d&apos;aquesta obra</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Stat label="Vinyetes" value={stats.vignettes} href="/admin/vignettes" />
          <Stat label="Publicades" value={stats.published} href="/admin/vignettes?estat=published" />
          <Stat label="Esborranys" value={stats.drafts} href="/admin/vignettes?estat=draft" />
          <Stat label="Arxivades" value={stats.archived} href="/admin/vignettes?estat=archived" />
          <Stat label="Capítols" value={stats.chapters} href="/admin/chapters" />
          <Stat label="Obres" value={stats.works} href="/admin/work" />
        </div>
      </div>

      <div>
        <h2 className="mb-4 font-mono text-[11px] uppercase tracking-widest text-smoke">Mediateca</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Fotografies" value={stats.images} href="/admin/media?tipus=image" />
          <Stat label="Àudios" value={stats.audio} href="/admin/media?tipus=audio" />
          <Stat label="Vídeos" value={stats.video} href="/admin/media?tipus=video" />
          <Stat label="Espai ocupat" value={formatBytes(stats.storageBytes)} />
        </div>
      </div>

      {stats.vignettes > 0 ? (
        <div className="max-w-xl">
          <div className="mb-2 flex justify-between font-mono text-[11px] uppercase tracking-widest text-smoke">
            <span>Progrés de publicació</span>
            <span>
              {stats.published} / {stats.vignettes}
            </span>
          </div>
          <div
            className="h-1 w-full bg-line"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={stats.vignettes}
            aria-valuenow={stats.published}
            aria-label="Vinyetes publicades"
          >
            <div className="h-full bg-paper" style={{ width: `${(stats.published / stats.vignettes) * 100}%` }} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
