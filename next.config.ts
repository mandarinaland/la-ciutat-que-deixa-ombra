import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";

/**
 * Les fotografies viuen a Supabase Storage (buckets privats + URLs signades).
 * next/image només accepta orígens explícits: derivem el host de la URL de Supabase
 * perquè funcioni igual a localhost (Supabase CLI), Vercel Preview i Production.
 */
function supabaseImagePatterns(): RemotePattern[] {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return [];
  const url = new URL(raw);
  const base = {
    protocol: url.protocol.replace(":", "") as "http" | "https",
    hostname: url.hostname,
    ...(url.port ? { port: url.port } : {}),
  };
  return [
    // URLs signades (media publicat servit des de buckets privats)
    { ...base, pathname: "/storage/v1/object/sign/**" },
    // Per si algun dia es fa públic el bucket d'imatges
    { ...base, pathname: "/storage/v1/object/public/**" },
  ];
}

/** Supabase local (CLI) viu a 127.0.0.1: només llavors deixem l'optimitzador llegir IPs locals. */
function isLocalSupabase(): boolean {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return false;
  const host = new URL(raw).hostname;
  return host === "127.0.0.1" || host === "localhost";
}

/**
 * Content-Security-Policy. Sense nonce (les pàgines públiques són estàtiques/ISR),
 * però tancada a: el mateix origen + Supabase (fitxers, pujades) i res més.
 */
function contentSecurityPolicy(): string {
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "";
  const dev = process.env.NODE_ENV !== "production";
  // La barra de comentaris de Vercel només existeix als desplegaments de Preview.
  const vercelLive = process.env.VERCEL_ENV === "preview" ? "https://vercel.live" : "";
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", dev ? "'unsafe-eval'" : "", vercelLive],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", supabase],
    "media-src": ["'self'", "blob:", supabase],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", supabase, supabase.replace(/^http/, "ws"), vercelLive],
    "frame-src": [vercelLive || "'none'"],
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    ...(supabase.startsWith("https:") ? { "upgrade-insecure-requests": [] } : {}),
  };
  return Object.entries(directives)
    .map(([k, v]) => [k, ...v.filter(Boolean)].join(" "))
    .join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Les imatges per compartir llegeixen les fonts del disc: que viatgin amb la funció.
  outputFileTracingIncludes: { "/**/opengraph-image": ["./src/assets/og/**"] },
  poweredByHeader: false,

  images: {
    formats: ["image/avif", "image/webp"],
    // Mides pensades per a fotografia a pantalla completa i miniatures d'admin
    deviceSizes: [480, 640, 828, 1080, 1280, 1600, 1920, 2560],
    imageSizes: [64, 128, 256, 384],
    // Next 16 exigeix declarar les qualitats permeses
    qualities: [60, 75, 85],
    // Les URLs signades són estables durant la finestra de signatura (vegeu docs/ARCHITECTURE.md)
    minimumCacheTTL: 60 * 60 * 24 * 7,
    remotePatterns: supabaseImagePatterns(),
    dangerouslyAllowLocalIP: isLocalSupabase(),
  },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // L'administració mai no s'ha d'indexar
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
