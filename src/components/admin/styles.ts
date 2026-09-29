/** Estils compartits (segurs per a Server i Client Components). */
export const inputClass =
  "w-full border border-line bg-ink-soft px-3 py-2 text-paper outline-none transition-colors placeholder:text-smoke/60 focus:border-paper aria-[invalid=true]:border-ember";

export const labelClass = "font-mono text-[11px] uppercase tracking-widest text-smoke";

export type ButtonTone = "primary" | "ghost" | "danger";

const tones: Record<ButtonTone, string> = {
  primary: "border-paper/70 hover:bg-paper hover:text-ink",
  ghost: "border-line text-smoke hover:border-paper hover:text-paper",
  danger: "border-ember/60 text-ember hover:bg-ember hover:text-ink",
};

export function buttonClass(tone: ButtonTone = "primary") {
  return `inline-flex items-center justify-center gap-2 border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]}`;
}

