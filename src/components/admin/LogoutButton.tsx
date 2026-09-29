import { logoutAction } from "@/lib/actions/auth";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="w-full px-2 py-2 text-left font-mono text-xs uppercase tracking-widest text-smoke hover:bg-ink-soft hover:text-paper"
      >
        Sortir
      </button>
    </form>
  );
}
