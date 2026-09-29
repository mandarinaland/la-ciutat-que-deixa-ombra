import { notFound, permanentRedirect } from "next/navigation";
import { DEFAULT_WORK_SLUG } from "@/lib/env";
import { isValidSlug, routes } from "@/lib/routing";

type Props = { params: Promise<{ slug: string }> };

/** Drecera: /capitols/vic → /auca/[obra per defecte]/vic (URL canònica). */
export default async function ChapterShortcut({ params }: Props) {
  const { slug } = await params;
  if (!isValidSlug(slug)) notFound();
  permanentRedirect(routes.chapter(DEFAULT_WORK_SLUG, slug));
}
