import { AmbientProvider } from "@/components/auca/Ambient";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh bg-ink">
      <AmbientProvider>{children}</AmbientProvider>
    </div>
  );
}
