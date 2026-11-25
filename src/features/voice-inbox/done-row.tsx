"use client";

import { useState, useTransition } from "react";
import { undoReview } from "./actions";
import type { VoiceInboxItem } from "./types";

/**
 * One filed note: where it went and who decided. Undo sends it back to
 * Needs you (status pending_review). Deleting happens only in Binned.
 */
export function DoneRow({ item }: { item: VoiceInboxItem }) {
  const [pending, startTransition] = useTransition();
  const [undone, setUndone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUndo = () => {
    setError(null);
    startTransition(async () => {
      const result = await undoReview(item.id);
      if (result.ok) setUndone(true);
      else setError(result.error);
    });
  };

  if (undone) {
    return (
      <li className="border-t border-[var(--line-soft)] py-3.5 text-[0.88rem] text-[var(--ink-soft)] first:border-t-0">
        {item.title} is back in Needs you.
      </li>
    );
  }

  const binned = item.status !== "filed";
  const where = doneLabel(item);

  return (
    <li className="flex flex-wrap items-start gap-x-4 gap-y-1 border-t border-[var(--line-soft)] py-3.5 first:border-t-0">
      <div className="min-w-0 flex-1">
        <h3 className="text-[0.95rem] font-medium leading-snug text-[var(--ink)]">{item.title}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[0.76rem]">
          <span className="rounded-md bg-[var(--paper)] px-2 py-0.5 text-[var(--ink)]">You</span>
          <span className="text-[var(--ink-faint)]">→</span>
          <span
            className={`rounded-md px-2 py-0.5 ${
              binned
                ? "border border-[var(--line)] text-[var(--ink-soft)]"
                : "bg-[var(--ok-soft)] text-[var(--ok)]"
            }`}
          >
            {where}
          </span>
          <span className="text-[var(--ink-faint)]">{item.reviewedAt ?? item.createdAt}</span>
        </div>
        {error && <p className="mt-1 text-[0.8rem] text-[var(--critical)]">Couldn&rsquo;t undo: {error}</p>}
      </div>
      <button
        type="button"
        onClick={handleUndo}
        disabled={pending}
        className="py-1 text-[0.8rem] text-[var(--ink-faint)] hover:text-[var(--accent)] disabled:opacity-50"
      >
        Undo
      </button>
    </li>
  );
}

/** Where a settled note went, in plain words. */
export function doneLabel(item: VoiceInboxItem): string {
  if (item.status === "dismissed") return "Binned";
  if (item.status === "archived") return "Archived";
  return `Filed to ${item.projectBucket || "unsorted"}`;
}
