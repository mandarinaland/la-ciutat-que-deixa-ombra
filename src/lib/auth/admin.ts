import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

export type AdminSession = {
  userId: string;
  email: string | null;
  role: Enums<"admin_role">;
};

/**
 * Qui és l'administrador actual? (una sola consulta per petició gràcies a `cache`).
 * getUser() valida el token contra Supabase Auth: no es refia de la cookie.
 */
export const getCurrentAdmin = cache(async (): Promise<AdminSession | null> => {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) return null;

  const { data: admin } = await supabase
    .from("admins")
    .select("role")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!admin) return null;

  return { userId: userData.user.id, email: userData.user.email ?? null, role: admin.role };
});

/**
 * Obligatori a:
 *  · el layout del panell (protegeix les pàgines)
 *  · CADA Server Action d'administració (els layouts no protegeixen les accions)
 */
export async function requireAdmin(): Promise<AdminSession> {
  const admin = await getCurrentAdmin();
  if (admin) return admin;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  // Amb sessió però sense permís → pàgina pròpia (evita bucles amb /admin/login).
  redirect(data.user ? "/admin/no-autoritzat" : "/admin/login");
}

export async function requireOwner(): Promise<AdminSession> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") redirect("/admin/no-autoritzat");
  return admin;
}
