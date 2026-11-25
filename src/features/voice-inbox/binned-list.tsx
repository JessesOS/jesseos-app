"use client";

import { useState, useTransition } from "react";
import { deleteBinned, getAudioUrl, undoReview } from "./actions";
import type { VoiceInboxItem } from "./types";

/**
 * Binned: notes you dropped. Preview each one, then bring it back (Undo) or
 * delete it for good. Delete forever removes the note and its recording and
 * cannot be undone, so it always asks first.
 */
export function BinnedList({
  items,
  onGoNeeds,
}: {
  items: VoiceInboxItem[];
  onGoNeeds: () => void;
}) {
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [restored, setRestored] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const visible = items.filter((i) => !gone.has(i.id));
  const selectable = visible.filter((i) => !restored.has(i.id));
  const allSelected = selectable.length > 0 && selectable.every((i) => selected.has(i.id));
  const selectedIds = selectable.filter((i) => selected.has(i.id)).map((i) => i.id);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const removeNow = (ids: string[]) => {
    setError(null);
    startTransition(async () => {
      const result = await deleteBinned(ids);
      if (result.ok) {
        setGone((prev) => new Set([...prev, ...ids]));
        setSelected((prev) => new Set([...prev].filter((id) => !ids.includes(id))));
        setConfirming(false);
      } else {
        setError(result.error);
      }
    });
  };

  if (visible.length === 0) {
    return <p className="px-5 py-6 text-[0.9rem] text-[var(--ink-faint)]">The bin is empty.</p>;
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--line-soft)] px-5 py-3 text-[0.84rem]">
        <label className="flex cursor-pointer items-center gap-2 text-[var(--ink-soft)]">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() =>
              setSelected(allSelected ? new Set() : new Set(selectable.map((i) => i.id)))
            }
            className="size-4 accent-[var(--accent)]"
          />
          Select all
        </label>

        {selectedIds.length > 0 && !confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-lg border border-[#f2d3cd] bg-[#fdf3f1] px-3 py-1 font-medium text-[var(--critical)]"
          >
            Delete {selectedIds.length} forever
          </button>
        )}

        {confirming && (
          <span className="flex flex-wrap items-center gap-2 text-[var(--ink)]">
            Delete {selectedIds.length} {selectedIds.length === 1 ? "note" : "notes"} and their
            recordings for good? This can&rsquo;t be undone.
            <button
              type="button"
              disabled={pending}
              onClick={() => removeNow(selectedIds)}
              className="rounded-lg bg-[var(--critical)] px-3 py-1 font-medium text-white disabled:opacity-50"
            >
              {pending ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(false)}
              className="px-2 py-1 text-[var(--ink-soft)]"
            >
              Cancel
            </button>
          </span>
        )}

        {error && <span className="text-[var(--critical)]">Couldn&rsquo;t delete: {error}</span>}
      </div>

      <ul className="px-5">
        {visible.map((item) => (
          <BinnedRow
            key={item.id}
            item={item}
            checked={selected.has(item.id)}
            isRestored={restored.has(item.id)}
            onCheck={() => toggle(item.id)}
            onRestored={() => {
              setRestored((prev) => new Set(prev).add(item.id));
              setSelected((prev) => {
                const next = new Set(prev);
                next.delete(item.id);
                return next;
              });
            }}
            onDeleted={() => setGone((prev) => new Set(prev).add(item.id))}
            onGoNeeds={onGoNeeds}
          />
        ))}
      </ul>
    </>
  );
}

function BinnedRow({
  item,
  checked,
  isRestored,
  onCheck,
  onRestored,
  onDeleted,
  onGoNeeds,
}: {
  item: VoiceInboxItem;
  checked: boolean;
  isRestored: boolean;
  onCheck: () => void;
  onRestored: () => void;
  onDeleted: () => void;
  onGoNeeds: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasFullText = item.fullText.length > 0 && item.fullText !== item.summary;
  const label = item.status === "archived" ? "Archived" : "Binned";

  const restore = () => {
    setError(null);
    startTransition(async () => {
      const result = await undoReview(item.id);
      if (result.ok) onRestored();
      else setError(result.error);
    });
  };

  const deleteForever = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteBinned([item.id]);
      if (result.ok) onDeleted();
      else setError(result.error);
    });
  };

  const playAudio = () => {
    setError(null);
    startTransition(async () => {
      const result = await getAudioUrl(item.id);
      if (result.ok) setAudioUrl(result.url);
      else setError(result.error);
    });
  };

  if (isRestored) {
    return (
      <li className="flex flex-wrap items-center gap-3 border-t border-[var(--line-soft)] py-3.5 text-[0.88rem] text-[var(--ink-soft)] first:border-t-0">
        <span>{item.title} is back in Needs you.</span>
        <button
          type="button"
          onClick={onGoNeeds}
          className="font-medium text-[var(--accent)] hover:underline"
        >
          Go to Needs you
        </button>
      </li>
    );
  }

  return (
    <li className="border-t border-[var(--line-soft)] py-3.5 first:border-t-0">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onCheck}
          aria-label={`Select ${item.title}`}
          className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
        />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="block w-full text-left"
          >
            <span className="block text-[0.95rem] font-medium leading-snug text-[var(--ink)]">
              {item.title}
            </span>
            {!open && (
              <span className="mt-0.5 block line-clamp-1 max-w-[68ch] text-[0.84rem] text-[var(--ink-soft)]">
                {item.summary}
              </span>
            )}
          </button>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[0.76rem] text-[var(--ink-faint)]">
            <span className="rounded-md border border-[var(--line)] px-2 py-0.5 text-[var(--ink-soft)]">
              {label}
            </span>
            <span>{item.reviewedAt ?? item.createdAt}</span>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="font-medium text-[var(--ink-soft)] hover:text-[var(--accent)]"
            >
              {open ? "Close preview" : "Preview"}
            </button>
          </div>

          {open && (
            <div className="mt-3 rounded-lg border border-[var(--line-soft)] bg-[var(--paper)] px-4 py-3">
              <p className="max-w-[68ch] text-[0.88rem] leading-relaxed text-[var(--ink-soft)]">
                {item.summary}
              </p>
              {item.nextStep && (
                <p className="mt-2 text-[0.84rem]">
                  <span className="font-medium text-[var(--accent)]">Next step</span>{" "}
                  <span className="text-[var(--ink-soft)]">{item.nextStep}</span>
                </p>
              )}
              {(item.people.length > 0 || item.tags.length > 0) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.people.map((p) => (
                    <span
                      key={`p-${p}`}
                      className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[0.72rem] font-medium text-[var(--accent)]"
                    >
                      {p}
                    </span>
                  ))}
                  {item.tags.map((t) => (
                    <span
                      key={`t-${t}`}
                      className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[0.72rem] text-[var(--ink-faint)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {hasFullText && (
                <p className="mt-3 whitespace-pre-wrap border-t border-[var(--line-soft)] pt-3 text-[0.84rem] leading-relaxed text-[var(--ink-soft)]">
                  {item.fullText}
                </p>
              )}
              {item.hasAudio && !audioUrl && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={playAudio}
                  className="mt-3 text-[0.82rem] font-medium text-[var(--ink-soft)] hover:text-[var(--accent)] disabled:opacity-50"
                >
                  ▸ Play audio
                </button>
              )}
              {audioUrl && (
                <audio controls autoPlay src={audioUrl} className="mt-3 h-9 w-full max-w-sm" />
              )}
            </div>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[0.82rem]">
            <button
              type="button"
              disabled={pending}
              onClick={restore}
              className="font-medium text-[var(--ink-soft)] hover:text-[var(--accent)] disabled:opacity-50"
            >
              Undo
            </button>
            {!confirming ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirming(true)}
                className="text-[var(--ink-faint)] hover:text-[var(--critical)] disabled:opacity-50"
              >
                Delete forever
              </button>
            ) : (
              <span className="flex items-center gap-2">
                <span className="text-[var(--ink)]">Delete for good?</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={deleteForever}
                  className="rounded-md bg-[var(--critical)] px-2.5 py-0.5 font-medium text-white disabled:opacity-50"
                >
                  {pending ? "Deleting…" : "Yes, delete"}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirming(false)}
                  className="text-[var(--ink-soft)]"
                >
                  Cancel
                </button>
              </span>
            )}
          </div>

          {error && <p className="mt-1 text-[0.8rem] text-[var(--critical)]">Couldn&rsquo;t do that: {error}</p>}
        </div>
      </div>
    </li>
  );
}
