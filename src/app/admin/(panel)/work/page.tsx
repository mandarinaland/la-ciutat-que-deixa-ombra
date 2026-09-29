import type { Metadata } from "next";
import { getCurrentWork, listWorks } from "@/lib/data/admin";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { selectWorkAction } from "@/lib/actions/work";
import { CreateWorkForm, DeleteWorkForm, WorkForm } from "@/components/admin/WorkForms";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const metadata: Metadata = { title: "Obra" };

export default async function WorkAdminPage() {
  const [works, current, admin] = await Promise.all([listWorks(), getCurrentWork(), getCurrentAdmin()]);

  return (
    <section className="flex flex-col gap-12">
      <header className="border-b border-line pb-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-smoke">Obra</p>
        <h1 className="text-3xl">{current?.title ?? "Cap obra"}</h1>
      </header>

      {current ? <WorkForm key={current.id} work={current} /> : null}

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
