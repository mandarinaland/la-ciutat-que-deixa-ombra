import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Administració", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-ink font-sans text-paper">{children}</div>;
}
