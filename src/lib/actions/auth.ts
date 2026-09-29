"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null; email: string };

const credentialsSchema = z.object({
  email: z.email("Correu electrònic no vàlid").max(320),
  password: z.string().min(1, "Escriu la contrasenya").max(512),
});

/** Només es permeten destinacions internes de l'administració (evita open redirects). */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  if (next.startsWith("/admin") && !next.startsWith("//") && !next.includes("\\") && !next.startsWith("/admin/login")) {
    return next;
  }
  return "/admin/dashboard";
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const email = typeof formData.get("email") === "string" ? String(formData.get("email")) : "";
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dades no vàlides", email };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  // Missatge genèric: no revelem si el correu existeix.
  if (error || !data.user) {
    return { error: "Credencials incorrectes.", email };
  }

  const { data: admin } = await supabase.from("admins").select("role").eq("user_id", data.user.id).maybeSingle();
  if (!admin) {
    await supabase.auth.signOut();
    return { error: "Aquest compte no té accés a l'administració.", email };
  }

  redirect(safeNext(formData.get("next")));
}

export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
