import { redirect } from "next/navigation";
import { DEFAULT_WORK_SLUG } from "@/lib/env";
import { routes } from "@/lib/routing";

/** /auca porta a l'obra per defecte. Quan hi hagi diverses obres, /obres en serà l'índex. */
export default function AucaIndexPage() {
  redirect(routes.work(DEFAULT_WORK_SLUG));
}
