"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToWindowEdges } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import type { ActionResult } from "@/lib/data/errors";
import { buttonClass } from "./styles";

export type SortableRow = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: React.ReactNode;
  thumb?: { src: string; alt: string; stable: boolean } | null;
  href?: string;
};

/**
 * Ordenar arrossegant (ratolí, dit o teclat) i desar d'un sol cop.
 * Res no canvia a la base de dades fins que es prem "Desar l'ordre".
 *  · Teclat: Tab fins a la nansa, Espai per agafar, ↑ ↓ per moure, Espai per deixar, Esc per cancel·lar.
 *  · Llistes llargues: cada fila té "Moure a la posició…" per a salts grans.
 */
export function SortableList({
  rows: initial,
  noun,
  save,
}: {
  rows: SortableRow[];
  noun: { one: string; many: string };
  save: (ids: string[]) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [base, setBase] = useState(initial);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  // Si el servidor torna una llista diferent (p. ex. després de desar), es parteix d'aquella.
  const initialKey = initial.map((r) => r.id).join(",");
  const [seenKey, setSeenKey] = useState(initialKey);
  if (seenKey !== initialKey) {
    setSeenKey(initialKey);
    setRows(initial);
    setBase(initial);
  }

  const dirty = useMemo(() => rows.some((r, i) => r.id !== base[i]?.id), [rows, base]);
  const moved = useMemo(() => {
    const pos = new Map(base.map((r, i) => [r.id, i]));
    return new Set(rows.filter((r, i) => pos.get(r.id) !== i).map((r) => r.id));
  }, [rows, base]);

  // Avisa abans de tancar o recarregar la pàgina amb canvis sense desar.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const titleOf = (id: string | number) => rows.find((r) => r.id === id)?.title ?? noun.one;
  const posOf = (id: string | number) => rows.findIndex((r) => r.id === id) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Has agafat «${titleOf(active.id)}», posició ${posOf(active.id)} de ${rows.length}.`,
    onDragOver: ({ active, over }) =>
      over ? `«${titleOf(active.id)}» ara aniria a la posició ${posOf(over.id)}.` : `«${titleOf(active.id)}» fora de la llista.`,
    onDragEnd: ({ active, over }) =>
      over ? `«${titleOf(active.id)}» deixada a la posició ${posOf(over.id)}. Recorda desar l'ordre.` : "Moviment cancel·lat.",
    onDragCancel: ({ active }) => `Moviment de «${titleOf(active.id)}» cancel·lat.`,
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setMessage(null);
    setRows((list) => arrayMove(list, list.findIndex((r) => r.id === active.id), list.findIndex((r) => r.id === over.id)));
  };

  const moveTo = (id: string, position: number) => {
    setMessage(null);
    setRows((list) => {
      const from = list.findIndex((r) => r.id === id);
      const to = Math.min(Math.max(1, position), list.length) - 1;
      return from < 0 || from === to ? list : arrayMove(list, from, to);
    });
  };

  const onSave = () =>
    startTransition(async () => {
      const res = await save(rows.map((r) => r.id));
      if (res.ok) {
        setBase(rows);
        setMessage({ ok: true, text: "Ordre desat." });
        router.refresh();
      } else {
        setMessage({ ok: false, text: res.error ?? "No s'ha pogut desar." });
      }
    });

  return (
    <div className="grid gap-4">
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-ink/95 px-2 py-3 backdrop-blur">
        <p className="font-mono text-[11px] uppercase tracking-widest text-smoke" aria-live="polite">
          {dirty
            ? `${moved.size} ${moved.size === 1 ? noun.one : noun.many} canviarien de lloc · sense desar`
            : message?.ok
              ? `✓ ${message.text}`
              : `${rows.length} ${noun.many} · arrossega per ordenar`}
        </p>
        <div className="flex gap-2">
          <button type="button" disabled={!dirty || pending} onClick={() => setRows(base)} className={buttonClass("ghost")}>
            Desfer
          </button>
          <button type="button" disabled={!dirty || pending} onClick={onSave} className={buttonClass()}>
            {pending ? "Desant…" : "Desar l'ordre"}
          </button>
        </div>
      </div>
      {message && !message.ok ? (
        <p role="alert" className="font-mono text-xs text-ember">
          ✕ {message.text}
        </p>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
        onDragEnd={onDragEnd}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable: "Prem Espai per agafar. Mou amb les fletxes amunt i avall, Espai per deixar-ho, Esc per cancel·lar.",
          },
        }}
      >
        <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          <ol className="grid grid-cols-[minmax(0,1fr)] gap-1" aria-label={`Ordre de les ${noun.many}`}>
            {rows.map((r, i) => (
              <Row key={r.id} row={r} index={i} total={rows.length} moved={moved.has(r.id)} onMoveTo={moveTo} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function Row({
  row,
  index,
  total,
  moved,
  onMoveTo,
}: {
  row: SortableRow;
  index: number;
  total: number;
  moved: boolean;
  onMoveTo: (id: string, position: number) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const [jump, setJump] = useState("");
  const pad = Math.max(2, String(total).length);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`flex min-w-0 items-center gap-2 border px-2 py-2 sm:gap-3 ${
        isDragging ? "relative z-10 border-paper bg-ink-soft shadow-2xl" : moved ? "border-ember/50 bg-ink-soft/60" : "border-line bg-ink"
      }`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Moure «${row.title}» (posició ${index + 1})`}
        className="grid h-10 w-8 shrink-0 cursor-grab touch-none place-items-center text-smoke hover:text-paper active:cursor-grabbing"
      >
        <svg aria-hidden viewBox="0 0 10 16" className="h-4 w-2.5 fill-current">
          {[2, 8, 14].flatMap((y) => [<circle key={`a${y}`} cx="2" cy={y} r="1.4" />, <circle key={`b${y}`} cx="8" cy={y} r="1.4" />])}
        </svg>
      </button>
      <span className="w-8 shrink-0 font-mono text-sm tabular-nums text-smoke sm:w-12">{String(index + 1).padStart(pad, "0")}</span>
      {row.thumb !== undefined ? (
        <span className="relative h-12 w-12 shrink-0 overflow-hidden bg-ink-soft">
          {row.thumb ? (
            <Image
              src={row.thumb.src}
              alt={row.thumb.alt}
              fill
              sizes="48px"
              quality={60}
              unoptimized={!row.thumb.stable}
              className="object-cover"
              draggable={false}
            />
          ) : null}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate">{row.title}</span>
        {row.subtitle ? <span className="block truncate font-serif text-sm italic text-smoke">{row.subtitle}</span> : null}
        {row.meta ? <span className="block truncate font-mono text-[10px] text-smoke/80">{row.meta}</span> : null}
      </span>
      {row.badge}
      <form
        className="hidden items-center gap-1 sm:flex"
        onSubmit={(e) => {
          e.preventDefault();
          const n = Number(jump);
          if (Number.isInteger(n) && n >= 1) onMoveTo(row.id, n);
          setJump("");
        }}
      >
        <label className="sr-only" htmlFor={`jump-${row.id}`}>
          Moure «{row.title}» a la posició
        </label>
        <input
          id={`jump-${row.id}`}
          inputMode="numeric"
          pattern="[0-9]*"
          value={jump}
          onChange={(e) => setJump(e.target.value.replace(/\D/g, ""))}
          placeholder="#"
          className="h-8 w-14 border border-line bg-transparent px-2 text-center font-mono text-xs text-paper placeholder:text-smoke/60 focus:border-paper focus:outline-none"
        />
        <button type="submit" className="h-8 border border-line px-2 font-mono text-[10px] uppercase tracking-widest text-smoke hover:border-paper hover:text-paper">
          Moure
        </button>
      </form>
    </li>
  );
}
