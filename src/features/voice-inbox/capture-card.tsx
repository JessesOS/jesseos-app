"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { VoiceInboxItem, Priority } from "./types";
import { FALLBACK_PROJECT_NAMES, type ActionResult } from "./buckets";
import {
  fileCapture,
  dismissCapture,
  undoReview,
  getAudioUrl,
} from "./actions";
import { projectColor } from "@/features/projects/colors";

/** Imperative surface for keyboard shortcuts (see dashboard-client.tsx). */
export type CaptureCardHandle = {
  primary: () => void;
  keep: () => void;
  dismiss: () => void;
  undo: () => void;
};

type CaptureCardProps = {
  item: VoiceInboxItem;
  projectNames?: string[];
  focused?: boolean;
  registerHandle?: (id: string, handle: CaptureCardHandle | null) => void;
};

export function CaptureCard({ item, projectNames, focused, registerHandle }: CaptureCardProps) {
  const projects =
    projectNames && projectNames.length > 0
      ? projectNames
      : (FALLBACK_PROJECT_NAMES as readonly string[]);

  const [bucket, setBucket] = useState(
    projects.includes(item.projectBucket) ? item.projectBucket : "unsorted",
  );
  const [priority, setPriority] = useState<Priority>(item.priority);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<null | "filed" | "dismissed" | "kept">(null);
  const [error, setError] = useState<string | null>(null);
  const [showFull, setShowFull] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [expanded, setExpanded] = useState(!item.disposable);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const liRef = useRef<HTMLLIElement>(null);

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

  const doFile = () => run(() => fileCapture(item.id, bucket, priority), "filed");
  const doDismiss = () => run(() => dismissCapture(item.id), "dismissed");

  // The AI's suggestion becomes the one-tap primary action.
  // Yes = do what the AI suggested: file it to its project, or bin it.
  const aiWantsBin = item.suggestedAction === "dismiss";
  const doPrimary = aiWantsBin ? doDismiss : doFile;
  const primaryLabel = "Yes";

  const handleUndo = () => {
    setError(null);
    startTransition(async () => {
      const result = await undoReview(item.id);
      if (result.ok) setDone(null);
      else setError(result.error);
    });
  };

  const handlePlayAudio = () => {
    setError(null);
    setAudioLoading(true);
    startTransition(async () => {
      const result = await getAudioUrl(item.id);
      setAudioLoading(false);
      if (result.ok) setAudioUrl(result.url);
      else setError(result.error);
    });
  };

  // Expose actions for keyboard shortcuts; keep the ref map current.
  const handleRef = useRef<CaptureCardHandle>({
    primary: doPrimary,
    keep: doFile,
    dismiss: doDismiss,
    undo: handleUndo,
  });
  useEffect(() => {
    handleRef.current = { primary: doPrimary, keep: doFile, dismiss: doDismiss, undo: handleUndo };
  });

  useEffect(() => {
    if (!registerHandle) return;
    const stable: CaptureCardHandle = {
      primary: () => handleRef.current.primary(),
      keep: () => handleRef.current.keep(),
      dismiss: () => handleRef.current.dismiss(),
      undo: () => handleRef.current.undo(),
    };
    registerHandle(item.id, stable);
    return () => registerHandle(item.id, null);
  }, [item.id, registerHandle]);

  useEffect(() => {
    if (focused) liRef.current?.scrollIntoView({ block: "nearest" });
  }, [focused]);

  const focusRing = focused
    ? "rounded-lg bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]/30"
    : "";
  const node = <GraphNode color={projectColor(bucket)} critical={priority === "critical"} />;

  // Once acted on, collapse into a quiet confirmation line (revalidation will
  // drop it from the list on the next load; this gives instant feedback).
  if (done) {
    const label =
      done === "filed" ? `Filed to ${bucket}` : done === "kept" ? "Kept as knowledge" : "Binned";
    return (
      <li
        ref={liRef}
        className={`relative flex items-center gap-3 border-t border-[var(--line-soft)] py-4 pl-9 first:border-t-0 ${focusRing}`}
      >
        {node}
        <p className="min-w-0 flex-1 truncate text-[0.9rem] text-[var(--ink-faint)]">
          <span className="text-[var(--accent)]">✓</span> {label}: {item.title}
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={handleUndo}
          className="shrink-0 py-1.5 text-[0.8rem] font-medium text-[var(--ink-soft)] underline-offset-2 hover:text-[var(--accent)] hover:underline disabled:opacity-50"
        >
          Undo
        </button>
      </li>
    );
  }

  // Junk captures (background noise, laughter) stay collapsed: one line, one
  // Dismiss, and a disclosure in case the AI judged wrong.
  if (item.disposable && !expanded) {
    return (
      <li
        ref={liRef}
        className={`relative flex items-center gap-3 border-t border-[var(--line-soft)] py-3.5 pl-9 first:border-t-0 ${focusRing}`}
      >
        <GraphNode color="#4a4d55" />
        <p className="min-w-0 flex-1 truncate text-[0.88rem] text-[var(--ink-faint)]">
          {item.title}
          <span className="ml-2 text-[0.76rem]">· nothing usable detected</span>
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={doDismiss}
          className="shrink-0 rounded-lg border border-[var(--line)] px-3 py-1.5 text-[0.78rem] font-medium text-[var(--ink-soft)] hover:border-[var(--clay)] hover:text-[var(--clay)] disabled:opacity-50"
        >
          Dismiss
        </button>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="shrink-0 py-1.5 text-[0.78rem] font-medium text-[var(--ink-faint)] hover:text-[var(--accent)]"
        >
          Expand
        </button>
      </li>
    );
  }

  return (
    <li
      ref={liRef}
      className={`relative border-t border-[var(--line-soft)] py-5 pl-9 first:border-t-0 ${focusRing}`}
    >
      {node}
      <div className="min-w-0">
        <h3 className="text-[1.06rem] font-medium leading-snug text-[var(--ink)]">
          {item.title}
        </h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.76rem]">
          <PriorityLabel priority={priority} />
          {item.kind && <span className="text-[var(--ink-faint)]">{item.kind}</span>}
          <span className="rounded-md bg-[var(--paper)] px-2 py-0.5 text-[var(--ink)]">{bucket}</span>
        </div>
        <p className="mt-2.5 max-w-[62ch] text-[0.94rem] leading-relaxed text-[var(--ink-soft)]">
          {item.summary}
        </p>

        {item.nextStep && (
          <p className="mt-1.5 text-[0.88rem] leading-relaxed text-[var(--ink)]">
            <span className="mono mr-1.5 text-[var(--ink-faint)]">Next</span>
            <span className="text-[var(--ink)]">{item.nextStep}</span>
          </p>
        )}

        {(item.people.length > 0 || item.tags.length > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {item.people.map((person) => (
              <span
                key={`p-${person}`}
                className="rounded-md border border-[var(--line)] px-2 py-0.5 text-[0.72rem] text-[var(--ink-soft)]"
              >
                {person}
              </span>
            ))}
            {item.tags.map((tag) => (
              <span
                key={`t-${tag}`}
                className="rounded-md border border-[var(--line)] px-2 py-0.5 text-[0.72rem] text-[var(--ink-faint)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
          {hasFullText && (
            <button
              type="button"
              onClick={() => setShowFull((v) => !v)}
              aria-expanded={showFull}
              aria-label={showFull ? "Hide full text" : "Show full text"}
              className="flex items-center gap-1 py-1 text-[0.78rem] font-medium text-[var(--ink-faint)] hover:text-[var(--accent)]"
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
          )}
          {item.hasAudio && !audioUrl && (
            <button
              type="button"
              onClick={handlePlayAudio}
              disabled={audioLoading}
              className="flex items-center gap-1 py-1 text-[0.78rem] font-medium text-[var(--ink-faint)] hover:text-[var(--accent)] disabled:opacity-50"
            >
              <svg width="8" height="8" viewBox="0 0 10 10" style={{ fill: "currentColor" }}>
                <path d="M1 0.5L9 5L1 9.5V0.5Z" />
              </svg>
              {audioLoading ? "Loading audio…" : "Play audio"}
            </button>
          )}
        </div>

        {showFull && (
          <p className="mt-2 whitespace-pre-wrap rounded-lg border border-[var(--line-soft)] bg-[var(--paper-raised)] px-3.5 py-3 text-[0.88rem] leading-relaxed text-[var(--ink-soft)]">
            {item.fullText}
          </p>
        )}

        {audioUrl && (
          <audio controls autoPlay src={audioUrl} className="mt-2 h-9 w-full max-w-sm" />
        )}

        {/* what the AI suggests, then one tap: Yes, Change, Bin */}
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.88rem]">
          <span className="mono text-[var(--ink-faint)]">AI wants</span>
          <span className="font-medium text-[var(--ink)]">
            {aiWantsBin ? "Bin it" : `File to ${bucket}`}
          </span>
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <ActionButton primary disabled={pending} onClick={doPrimary}>
            {primaryLabel}
          </ActionButton>
          <button
            type="button"
            onClick={() => setShowAdjust((v) => !v)}
            aria-expanded={showAdjust}
            className="rounded-lg border border-[var(--line)] bg-[var(--paper-raised)] px-3.5 py-1.5 text-[0.8rem] font-medium text-[var(--ink)] transition-colors hover:border-[var(--ink-faint)]"
          >
            {showAdjust ? "Close" : "Change"}
          </button>
          {!aiWantsBin && (
            <ActionButton disabled={pending} onClick={doDismiss}>
              Bin
            </ActionButton>
          )}

          <span className="ml-auto text-[0.76rem] text-[var(--ink-faint)]">
            {item.createdAt}
          </span>
        </div>

        {showAdjust && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--line-soft)] bg-[var(--paper)] px-3 py-2.5">
            <span className="text-[0.8rem] text-[var(--ink-soft)]">File to</span>
            <label className="sr-only" htmlFor={`bucket-${item.id}`}>
              Project for {item.title}
            </label>
            <select
              id={`bucket-${item.id}`}
              value={bucket}
              onChange={(e) => setBucket(e.target.value)}
              disabled={pending}
              className="rounded-lg border border-[var(--line)] bg-[var(--paper-raised)] px-2.5 py-1.5 text-[0.8rem] font-medium text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            >
              {projects.map((b) => (
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
              className="rounded-lg border border-[var(--line)] bg-[var(--paper-raised)] px-2.5 py-1.5 text-[0.8rem] font-medium capitalize text-[var(--ink-soft)] outline-none focus:border-[var(--ink-soft)]"
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <ActionButton primary disabled={pending} onClick={doFile}>
              Save
            </ActionButton>
          </div>
        )}

        {error && (
          <p className="mt-2 text-[0.8rem] text-[var(--clay)]">Couldn&rsquo;t save: {error}</p>
        )}
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
    "rounded-lg px-3.5 py-1.5 text-[0.8rem] font-medium transition-colors disabled:opacity-50";
  const style = primary
    ? "border border-[var(--accent)] bg-[var(--accent)] text-white hover:bg-[#2330b8]"
    : subtle
      ? "text-[var(--ink-faint)] hover:text-[var(--clay)]"
      : "border border-[var(--line)] bg-[var(--paper-raised)] text-[var(--ink)] hover:border-[var(--ink-faint)]";
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${style}`}>
      {children}
    </button>
  );
}

/**
 * Row marker: a small outlined circle on the left of each capture.
 * Critical items get a red ring. The project colour shows as a small dot inside.
 * Needs a `relative` parent with left padding (pl-9).
 */
export function GraphNode({
  color,
  critical,
  top = "1.85rem",
}: {
  color: string;
  critical?: boolean;
  top?: string;
}) {
  return (
    <span
      aria-hidden
      className="absolute left-0 grid size-5 place-items-center rounded-full border bg-[var(--paper-raised)]"
      style={{
        top: `calc(${top} - 5px)`,
        borderColor: critical ? "var(--critical)" : "var(--line)",
      }}
    >
      <span className="size-1.5 rounded-full" style={{ background: color }} />
    </span>
  );
}

/** Text priority label — unmistakable, matches the Filed view's pattern. */
export function PriorityLabel({ priority }: { priority: Priority }) {
  const color =
    priority === "critical"
      ? "var(--critical)"
      : priority === "high"
        ? "var(--clay)"
        : priority === "medium"
          ? "var(--amber)"
          : "var(--ink-faint)";
  return (
    <span
      className={`shrink-0 text-[0.72rem] capitalize ${
        priority === "critical" ? "font-semibold" : "font-medium"
      }`}
      style={{ color }}
    >
      {priority}
    </span>
  );
}
