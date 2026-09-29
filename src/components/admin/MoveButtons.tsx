/** Moure amunt/avall d'una posició (funciona sense JavaScript). Per a canvis grans: pàgina «Ordenar». */
export function MoveButtons({
  id,
  action,
  isFirst,
  isLast,
  label,
}: {
  id: string;
  action: (formData: FormData) => Promise<void>;
  isFirst: boolean;
  isLast: boolean;
  label: string;
}) {
  const cls =
    "h-7 w-7 border border-line font-mono text-xs text-smoke hover:border-paper hover:text-paper disabled:opacity-20 disabled:hover:border-line";
  return (
    <div className="flex gap-1">
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="direction" value="up" />
        <button type="submit" disabled={isFirst} className={cls} aria-label={`Pujar ${label}`}>
          ↑
        </button>
      </form>
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="direction" value="down" />
        <button type="submit" disabled={isLast} className={cls} aria-label={`Baixar ${label}`}>
          ↓
        </button>
      </form>
    </div>
  );
}
