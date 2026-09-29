import type { Metadata } from "next";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { getUploadLimits } from "@/lib/data/settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AddAdminForm, RemoveAdminForm, UploadLimitsForm } from "@/components/admin/SettingsForms";

export const metadata: Metadata = { title: "Configuració" };

async function adminEmails(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || ids.length === 0) return out;
  const { createSupabaseServiceClient } = await import("@/lib/supabase/admin");
  const service = createSupabaseServiceClient();
  await Promise.all(
    ids.map(async (id) => {
      const { data } = await service.auth.admin.getUserById(id);
      if (data.user?.email) out.set(id, data.user.email);
    }),
  );
  return out;
}

export default async function SettingsAdminPage() {
  const supabase = await createSupabaseServerClient();
  const [limits, me, { data: admins }] = await Promise.all([
    getUploadLimits(),
    getCurrentAdmin(),
    supabase.from("admins").select("user_id, role, created_at").order("created_at"),
  ]);
  const isOwner = me?.role === "owner";
  const emails = isOwner ? await adminEmails((admins ?? []).map((a) => a.user_id)) : new Map<string, string>();

  return (
    <section className="flex flex-col gap-12">
      <header className="border-b border-line pb-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-smoke">Configuració</p>
        <h1 className="text-3xl">Configuració</h1>
      </header>

      <div className="grid gap-4">
        <h2 className="font-mono text-[11px] uppercase tracking-widest text-smoke">Límits de pujada</h2>
        <p className="max-w-2xl font-mono text-xs leading-relaxed text-smoke">
          Mida màxima per fitxer. No pot superar el límit del bucket de Supabase (al pla gratuït, 50 MB per fitxer).
        </p>
        <UploadLimitsForm limits={limits} />
      </div>

      <div className="grid gap-4">
        <h2 className="font-mono text-[11px] uppercase tracking-widest text-smoke">Administradors</h2>
        <ul className="divide-y divide-line border-y border-line">
          {(admins ?? []).map((a) => (
            <li key={a.user_id} className="flex flex-wrap items-center justify-between gap-3 py-3 font-mono text-xs">
              <span>
                {emails.get(a.user_id) ?? a.user_id}
                {a.user_id === me?.userId ? <span className="text-smoke"> (tu)</span> : null}
              </span>
              <span className="flex items-center gap-4">
                <span className="uppercase tracking-widest text-smoke">{a.role}</span>
                {isOwner && a.user_id !== me?.userId ? <RemoveAdminForm userId={a.user_id} /> : null}
              </span>
            </li>
          ))}
        </ul>
        {isOwner ? (
          <>
            <p className="max-w-2xl font-mono text-xs leading-relaxed text-smoke">
              Els comptes es creen a Supabase → Authentication → Users (els registres públics estan tancats). Aquí només es dona o es treu accés.
            </p>
            <AddAdminForm />
          </>
        ) : (
          <p className="font-mono text-xs text-smoke">Només un owner pot gestionar administradors.</p>
        )}
      </div>
    </section>
  );
}
