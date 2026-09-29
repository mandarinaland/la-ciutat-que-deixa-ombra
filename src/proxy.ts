import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16: `proxy.ts` substitueix l'antic `middleware.ts`.
 *
 * FASE 1 (ara): mentre no hi hagi autenticació, /admin no existeix a Vercel Production.
 *               A localhost i a Preview es pot navegar per veure l'estructura (no conté dades).
 * FASE 3:       aquí es refrescarà la sessió de Supabase i es redirigirà a /admin/login.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && process.env.VERCEL_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
