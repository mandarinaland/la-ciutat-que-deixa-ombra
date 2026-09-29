import localFont from "next/font/local";

/**
 * Fonts autoallotjades (sense dependència de Google Fonts en temps de build).
 * EB Garamond: la veu, el text literari. IBM Plex Mono: la numeració, el "07 / 49".
 */
export const serif = localFont({
  src: [
    { path: "../../node_modules/@fontsource-variable/eb-garamond/files/eb-garamond-latin-wght-normal.woff2", style: "normal", weight: "400 800" },
    { path: "../../node_modules/@fontsource-variable/eb-garamond/files/eb-garamond-latin-wght-italic.woff2", style: "italic", weight: "400 800" },
  ],
  variable: "--font-garamond",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const mono = localFont({
  src: [
    { path: "../../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2", style: "normal", weight: "400" },
    { path: "../../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2", style: "normal", weight: "500" },
  ],
  variable: "--font-plex",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});
