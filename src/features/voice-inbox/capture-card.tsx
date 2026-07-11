"use client";

import { useState, useTransition } from "react";
import type { VoiceInboxItem, Priority } from "./types";
import { PROJECT_BUCKETS, type ActionResult } from "./buckets";
import { fileCapture, dismissCapture, promoteCapture, undoReview } from "./actions";

export function CaptureCard({ item }: { item: VoiceInboxItem }) {
  const [bucket, setBucket] = useState(
    (PROJECT_BUCKETS as readonly string[]).includes(item.projectBucket)
      ? item.projectBucket
      : "unsorted",
  );
  const [priority, setPriority] = useState<Priority>(item.priority);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<null | "filed" | "dismissed" | "kept">(null);
  const [error, setError] = useState<string | null>(null);
  const [showFull, setShowFull] = useState(false);

  const hasFullText = item.fullText.length > 0 && item.fullText !== item.summary;

  const run = (action: () => Promise<ActionResult>, mark: typeof done) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setDone(mark);
      } else {
        setError(result.error);
      }
    });
  };

  const handleUndo = () => {
    setError(null);
    startTransition(async () => {
      const result = await undoReview(item.id);
      if (result.ok) setDone(null);
      else setError(result.error);
    });
  };

  // Once acted on, collapse into a quiet confirmation line (revalidation will
  // drop it from the list on the next load; this gives instant feedback).
  if (done) {
    const label =
      done === "filed" ? "Filed" : done === "kept" ? "Kept as knowledge" : "Dismissed";
    return (
      <li className="flex items-center gap-3 border-t border-[var(--line-soft)] py-4 first:border-t-0">
        <p className="min-w-0 flex-1 truncate text-[0.9rem] text-[var(--ink-faint)]">
          <span className="text-[var(--accent)]">✓</span> {label} — {item.title}
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={handleUndo}
          className="shrink-0 text-[0.8rem] font-medium text-[var(--ink-soft)] underline-offset-2 hover:text-[var(--accent)] hover:underline disabled:opacity-50"
        >
          Undo
        </button>
      </li>
    );
  }

  return (
    <li className="border-t border-[var(--line-soft)] py-5 first:border-t-0">
      <div className="flex items-start gap-3">
        <PriorityDot priority={priority} />
        <div className="min-w-0 flex-1">
          <h3 className="text-[1.02rem] font-medium leading-snug text-[var(--ink)]">
            {item.title}
          </h3>
          <p className="mt-1 text-[0.92rem] leading-relaxed text-[var(--ink-soft)]">
            {item.summary}
          </p>

          {hasFullText && (
            <>
              <button
                type="button"
                onClick={() => setShowFull((v) => !v)}
                aria-expanded={showFull}
                aria-label={showFull ? "Hide full text" : "Show full text"}
                className="mt-1.5 flex items-center gap-1 text-[0.78rem] font-medium text-[var(--ink-faint)] hover:text-[var(--accent)]"
              >
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 10 10"
                  className={`transition-transform duration-150 ${showFull ? "rotate-90" : ""}`}
                  style={{ fill: "currentColor" }}
                >
                  <path d="M1 0.5L9 5L1 9.5V0.5Z" />
                </svg>
                Full text
              </button>
              {showFull && (
                <p className="mt-2 whitespace-pre-wrap rounded-lg border border-[var(--line-soft)] bg-[var(--paper-raised)] px-3.5 py-3 text-[0.88rem] leading-relaxed text-[var(--ink-soft)]">
                  {item.fullText}
                </p>
              )}
            </>
          )}

          {/* review controls */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor={`bucket-${item.id}`}>
              Project for {item.title}
            </label>
            <select
              id={`bucket-${item.id}`}
              value={bucket}
              onChange={(e) => setBucket(e.target.value)}
              disabled={pending}
              className="rounded-full border border-[var(--line)] bg-[var(--paper-raised)] px-2.5 py-1 text-[0.78rem] font-medium text-[var(--accent)] outline-none focus:border-[var(--accent)]"
            >
              {PROJECT_BUCKETS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor={`priority-${item.id}`}>
              Priority for {item.title}
            </label>
            <select
              id={`priority-${item.id}`}
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              disabled={pending}
              className="rounded-full border border-[var(--line)] bg-[var(--paper-raised)] px-2.5 py-1 text-[0.78rem] font-medium capitalize text-[var(--ink-soft)] outline-none focus:border-[var(--ink-soft)]"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <ActionButton primary disabled={pending} onClick={() => run(() => fileCapture(item.id, bucket, priority), "filed")}>
              File
            </ActionButton>
            <ActionButton disabled={pending} onClick={() => run(() => promoteCapture(item.id, bucket, priority), "kept")}>
              Keep as knowledge
            </ActionButton>
            <ActionButton subtle disabled={pending} onClick={() => run(() => dismissCapture(item.id), "dismissed")}>
              Dismiss
            </ActionButton>

            <span className="ml-auto text-[0.76rem] text-[var(--ink-faint)]">
              {item.createdAt}
            </span>
          </div>

          {error && (
            <p className="mt-2 text-[0.8rem] text-[var(--clay)]">Couldn&rsquo;t save: {error}</p>
          )}
        </div>
      </div>
    </li>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  primary,
  subtle,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  subtle?: boolean;
}) {
  const base =
    "rounded-full px-3 py-1 text-[0.78rem] font-medium transition-colors disabled:opacity-50";
  const style = primary
    ? "bg-[var(--accent)] text-white hover:opacity-90"
    : subtle
      ? "text-[var(--ink-faint)] hover:text-[var(--clay)]"
      : "border border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--accent)] hover:text-[var(--accent)]";
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${style}`}>
      {children}
    </button>
  );
}

export function PriorityDot({ priority }: { priority: Priority }) {
  const color =
    priority === "high"
      ? "var(--clay)"
      : priority === "medium"
        ? "var(--amber)"
        : "var(--ink-faint)";
  return (
    <span
      className="mt-2 size-2 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
      title={`${priority} priority`}
    />
  );
}
