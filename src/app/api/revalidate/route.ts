import { timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { CONTENT_TAG } from "@/lib/data/public";
import { MEDIA_URLS_TAG } from "@/lib/media/sources";

export const dynamic = "force-dynamic";

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Refresca la web pública quan el contingut s'ha canviat FORA de l'admin
 * (p. ex. directament a Supabase). Des de l'admin no cal: ja es fa sol.
 *
 *   curl -X POST https://deixaombra.art/api/revalidate -H "Authorization: Bearer $REVALIDATE_SECRET"
 */
export async function POST(request: NextRequest) {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || expected.length < 16) {
    return NextResponse.json({ error: "REVALIDATE_SECRET no configurat" }, { status: 503 });
  }
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!sameSecret(given, expected)) {
    return NextResponse.json({ error: "No autoritzat" }, { status: 401 });
  }
  revalidateTag(CONTENT_TAG, { expire: 0 });
  revalidateTag(MEDIA_URLS_TAG, { expire: 0 });
  revalidatePath("/", "layout");
  return NextResponse.json({ revalidated: true, at: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
