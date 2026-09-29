import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16: `proxy.ts` (abans `middleware.ts`).
 *
 * Només s'executa a /admin: la part pública no llegeix sessions i així
 * es pot servir des de la cache de Vercel sense cap cost per petició.
 *
 * Aquesta és la primera barrera (redirigir si no hi ha sessió).
 * La decisió real — és administrador? — es pren al servidor (requireAdmin)
 * i a PostgreSQL (RLS). Mai només aquí.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const { response, userId, configured } = await updateSession(request);

  // Sense Supabase configurat, l'administració es tanca (fail closed).
  if (!configured) {
    return new NextResponse("Administració no disponible: falta configurar Supabase.", { status: 503 });
  }

  const isLogin = pathname === "/admin/login";

  if (!userId && !isLogin) {
    const login = request.nextUrl.clone();
    login.pathname = "/admin/login";
    login.search = "";
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  if (userId && isLogin) {
    const dashboard = request.nextUrl.clone();
    dashboard.pathname = "/admin/dashboard";
    dashboard.search = "";
    return NextResponse.redirect(dashboard);
  }

  // No cachejar mai respostes d'administració.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
