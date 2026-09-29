import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

/**
 * Comprovació ràpida després de cada desplegament:  GET /api/health
 * No retorna cap dada de l'obra, només si l'aplicació arriba a Supabase.
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ app: "ok", supabase: "not_configured" }, { status: 503 });
  }
  const { error } = await createPublicClient().from("site_settings").select("key", { head: true, count: "exact" });
  return NextResponse.json(
    {
      app: "ok",
      supabase: error ? "error" : "ok",
      serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY ? "configured" : "missing",
      env: process.env.VERCEL_ENV ?? "local",
    },
    { status: error ? 503 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
