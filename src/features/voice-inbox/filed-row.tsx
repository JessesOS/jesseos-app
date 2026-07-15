"use client";

import { useState, useTransition } from "react";
import type { VoiceInboxItem, Priority } from "./types";
import { PriorityLabel } from "./capture-card";
import { updatePriority, archiveCapture, unarchiveCapture } from "./actions";

export function FiledRow({ item }: { item: VoiceInboxItem }) {
  const [priority, setPriority] = useState<Priority>(item.priority);
  const [archived, setArchived] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showFull, setShowFull] = useState(false);

  const hasFullText = item.fullText.length > 0 && item.fullText !== item.summary;

  const handlePriorityChange = (next: Priority) => {
    setPriority(next);
    setError(null);
    startTransition(async () => {
      const result = await updatePriority(item.id, next);
      if (!result.ok) setError(result.error);
    });
  };

  const handleArchive = () => {
    setError(null);
    startTransition(async () => {
      const result = await archiveCapture(item.id);
      if (result.ok) setArchived(true);
      else setError(result.error);
    });
  };

  const handleUnarchive = () => {
    setError(null);
    startTransition(async () => {
      const result = await unarchiveCapture(item.id);
      if (result.ok) setArchived(false);
      else setError(result.error);
    });
  };

  if (archived) {
    return (
      <li className="flex items-center gap-3 border-t border-[var(--line-soft)] py-3 first:border-t-0">
        <p className="min-w-0 flex-1 truncate text-[0.85rem] text-[var(--ink-faint)]">
          Archived — {item.title}
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={handleUnarchive}
          className="shrink-0 text-[0.78rem] font-medium text-[var(--ink-soft)] underline-offset-2 hover:text-[var(--accent)] hover:underline disabled:opacity-50"
        >
          Undo
        </button>
      </li>
    );
  }

  return (
    <li className="group flex items-start gap-2.5 border-t border-[var(--line-soft)] py-3 first:border-t-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h3 className="text-[0.95rem] font-medium leading-snug text-[var(--ink)]">{item.title}</h3>
          {priority !== "low" && <PriorityLabel priority={priority} />}
        </div>
        <p className="mt-0.5 line-clamp-3 text-[0.82rem] text-[var(--ink-soft)]">{item.summary}</p>

        {hasFullText && (
          <>
            <button
              type="button"
              onClick={() => setShowFull((v) => !v)}
              aria-expanded={showFull}
              aria-label={showFull ? "Hide full text" : "Show full text"}
              className="mt-1 flex items-center gap-1 text-[0.72rem] font-medium text-[var(--ink-faint)] hover:text-[var(--accent)]"
            >
              <svg
                width="7"
                height="7"
                viewBox="0 0 10 10"
                className={`transition-transform duration-150 ${showFull ? "rotate-90" : ""}`}
                style={{ fill: "currentColor" }}
              >
                <path d="M1 0.5L9 5L1 9.5V0.5Z" />
              </svg>
              Full text
            </button>
            {showFull && (
              <p className="mt-1.5 whitespace-pre-wrap rounded-lg border border-[var(--line-soft)] bg-[var(--paper-raised)] px-3 py-2.5 text-[0.82rem] leading-relaxed text-[var(--ink-soft)]">
                {item.fullText}
              </p>
            )}
          </>
        )}

        <div className="mt-1.5 flex items-center gap-2">
          <select
            value={priority}
            onChange={(e) => handlePriorityChange(e.target.value as Priority)}
            disabled={pending}
            className="rounded-full border border-[var(--line)] bg-[var(--paper-raised)] px-2 py-0.5 text-[0.72rem] font-medium capitalize text-[var(--ink-soft)] outline-none focus:border-[var(--ink-soft)]"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button
            type="button"
            disabled={pending}
            onClick={handleArchive}
            className="text-[0.72rem] font-medium text-[var(--ink-faint)] underline-offset-2 hover:text-[var(--clay)] hover:underline disabled:opacity-50"
          >
            Archive
          </button>
        </div>

        {error && <p className="mt-1 text-[0.76rem] text-[var(--clay)]">Couldn&rsquo;t save: {error}</p>}
      </div>
    </li>
  );
}
