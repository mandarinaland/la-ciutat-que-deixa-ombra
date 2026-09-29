import { notFound } from "next/navigation";
import { QuietPage } from "@/components/public/QuietPage";
import { isValidSlug } from "@/lib/routing";

type Props = { params: Promise<{ work: string }> };

/** FASE 12: inici del mode auca per a l'obra `work` (llegida de Supabase). */
export default async function WorkPage({ params }: Props) {
  const { work } = await params;
  if (!isValidSlug(work)) notFound();

  return (
    <QuietPage eyebrow="Auca" title="La ciutat que deixa ombra">
      Les vinyetes encara s&apos;estan revelant.
    </QuietPage>
  );
}
