import type { Metadata, Viewport } from "next";
import { mono, serif } from "./fonts";
import { getSiteUrl, isIndexable, siteConfig } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s — ${siteConfig.name}`,
  },
  description:
    "Una auca contemporània: fotografies de David Teulats, textos i veu de Piath. Una ciutat mirada, i que mira.",
  applicationName: siteConfig.name,
  authors: [{ name: "David Teulats" }, { name: "Piath" }],
  creator: "Piath",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.tagline,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.tagline,
  },
  robots: isIndexable() ? { index: true, follow: true } : { index: false, follow: false },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#0d0d0c",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={siteConfig.lang} className={`${serif.variable} ${mono.variable}`}>
      <body className="min-h-dvh">
        <a
          href="#contingut"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-paper focus:px-3 focus:py-2 focus:text-ink"
        >
          Salta al contingut
        </a>
        {children}
      </body>
    </html>
  );
}
