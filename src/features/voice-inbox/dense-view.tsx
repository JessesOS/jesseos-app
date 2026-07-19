"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { KnowledgePacketItem } from "@/features/knowledge-packets/types";
import type { VoiceInboxItem, Priority } from "./types";
import { FALLBACK_PROJECT_NAMES, type ActionResult } from "./buckets";
import {
  fileCapture,
  dismissCapture,
  promoteCapture,
  undoReview,
  updatePriority,
  archiveCapture,
  unarchiveCapture,
  getAudioUrl,
} from "./actions";
import { PriorityLabel, criticalEdge, type CaptureCardHandle } from "./capture-card";

/**
 * Detail mode — the daily check-in snapshot. One page, every section, dense
 * typography. Same server actions and undo semantics as the calm view; only
 * the information density changes.
 */

type DenseViewProps = {
  pending: VoiceInboxItem[];
  filedByProject: [string, VoiceInboxItem[]][];
  knowledgeItems: KnowledgePacketItem[];
  projectNames: string[];
  focusedId: string | null;
  registerHandle: (id: string, handle: CaptureCardHandle | null) => void;
  reviewError?: string;
};

export function DenseView({
  pending,
  filedByProject,
  knowledgeItems,
  projectNames,
  focusedId,
  registerHandle,
  reviewError,
}: DenseViewProps) {
  const filedCount = filedByProject.reduce((sum, [, items]) => sum + items.length, 0);

  return (
    <div className="mt-6 space-y-10">
      <section id="dense-review">
        <DenseSectionHeader label="To review" count={pending.length} />
        {reviewError ? (
          <p className="mt-2 text-[0.8rem] text-[var(--clay)]">{reviewError}</p>
        ) : pending.length === 0 ? (
          <p className="mt-2 text-[0.8rem] text-[var(--ink-faint)]">Nothing to review.</p>
        ) : (
          <ul>
            {pending.map((item) => (
              <DenseCaptureRow
                key={item.id}
                item={item}
                projectNames={projectNames}
                focused={focusedId === item.id}
                registerHandle={registerHandle}
              />
            ))}
          </ul>
        )}
      </section>

      <section id="dense-filed">
        <DenseSectionHeader label="Filed" count={filedCount} />
        {filedCount === 0 ? (
          <p className="mt-2 text-[0.8rem] text-[var(--ink-faint)]">Nothing filed yet.</p>
        ) : (
          <div className="mt-1 space-y-6">
            {filedByProject.map(([bucket, items]) => (
              <div key={bucket}>
                <h3 className="mb-1 flex items-baseline gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                  {bucket}
                  <span className="text-[var(--ink-faint)]">{items.length}</span>
                </h3>
                <ul>
                  {items.map((item) => (
                    <DenseFiledRow key={item.id} item={item} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section id="dense-knowledge">
        <DenseSectionHeader label="Knowledge" count={knowledgeItems.length} />
        {knowledgeItems.length === 0 ? (
          <p className="mt-2 text-[0.8rem] text-[var(--ink-faint)]">No knowledge kept yet.</p>
        ) : (
          <ul>
            {knowledgeItems.map((item) => (
              <li key={item.id} className="border-t border-[var(--line-soft)] py-2 first:border-t-0">
                <h4 className="text-[0.85rem] font-medium leading-snug text-[var(--ink)]">
                  {item.title}
                </h4>
                <p className="mt-0.5 line-clamp-2 text-[0.78rem] leading-snug text-[var(--ink-soft)]">
                  {item.summary}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function DenseSectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <h2 className="flex items-baseline gap-2 border-b border-[var(--line)] pb-1.5 text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-[var(--ink)]">
      {label}
      <span className="font-medium tabular-nums text-[var(--ink-faint)]">{count}</span>
    </h2>
  );
}

/** Meta line: kind · project · date — one faint row under the title. */
function MetaLine({ parts }: { parts: (string | null)[] }) {
  const visible = parts.filter((p): p is string => Boolean(p));
  if (visible.length === 0) return null;
  return (
    <p className="text-[0.7rem] leading-snug text-[var(--ink-faint)]">{visible.join(" · ")}</p>
  );
}

function ChipRow({ people, tags }: { people: string[]; tags: string[] }) {
  if (people.length === 0 && tags.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {people.map((person) => (
        <span
          key={`p-${person}`}
          className="rounded-full bg-[var(--accent-soft)] px-1.5 py-px text-[0.68rem] font-medium text-[var(--accent)]"
        >
          {person}
        </span>
      ))}
      {tags.map((tag) => (
        <span
          key={`t-${tag}`}
          className="rounded-full border border-[var(--line-soft)] px-1.5 py-px text-[0.68rem] text-[var(--ink-faint)]"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function DenseCaptureRow({
  item,
  projectNames,
  focused,
  registerHandle,
}: {
  item: VoiceInboxItem;
  projectNames: string[];
  focused: boolean;
  registerHandle: (id: string, handle: CaptureCardHandle | null) => void;
}) {
  const projects =
    projectNames.length > 0 ? projectNames : (FALLBACK_PROJECT_NAMES as readonly string[]);

  const [bucket, setBucket] = useState(
    projects.includes(item.projectBucket) ? item.projectBucket : "unsorted",
  );
  const [priority, setPriority] = useState<Priority>(item.priority);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<null | "filed" | "dismissed" | "kept">(null);
  const [error, setError] = useState<string | null>(null);
  const [showFull, setShowFull] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const liRef = useRef<HTMLLIElement>(null);

  const hasFullText = item.fullText.length > 0 && item.fullText !== item.summary;

  const run = (action: () => Promise<ActionResult>, mark: typeof done) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) setDone(mark);
      else setError(result.error);
    });
  };

  const doFile = () => run(() => fileCapture(item.id, bucket, priority), "filed");
  const doKeep = () => run(() => promoteCapture(item.id, bucket, priority), "kept");
  const doDismiss = () => run(() => dismissCapture(item.id), "dismissed");
  const doPrimary =
    item.suggestedAction === "keep_as_knowledge"
      ? doKeep
      : item.suggestedAction === "dismiss"
        ? doDismiss
        : doFile;

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
    startTransition(async () => {
      const result = await getAudioUrl(item.id);
      if (result.ok) setAudioUrl(result.url);
      else setError(result.error);
    });
  };

  // Same keyboard-shortcut registration contract as CaptureCard.
  const handleRef = useRef<CaptureCardHandle>({
    primary: doPrimary,
    keep: doKeep,
    dismiss: doDismiss,
    undo: handleUndo,
  });
  useEffect(() => {
    handleRef.current = { primary: doPrimary, keep: doKeep, dismiss: doDismiss, undo: handleUndo };
  });
  useEffect(() => {
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
    ? "-mx-2 rounded-lg bg-[var(--accent-soft)]/70 px-2 ring-1 ring-[var(--accent)]/30"
    : "";

  if (done) {
    const label =
      done === "filed" ? "Filed" : done === "kept" ? "Kept as knowledge" : "Dismissed";
    return (
      <li
        ref={liRef}
        className={`flex items-center gap-2 border-t border-[var(--line-soft)] py-2 first:border-t-0 ${focusRing}`}
      >
        <p className="min-w-0 flex-1 truncate text-[0.78rem] text-[var(--ink-faint)]">
          <span className="text-[var(--accent)]">✓</span> {label} — {item.title}
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={handleUndo}
          className="shrink-0 text-[0.72rem] font-medium text-[var(--ink-soft)] underline-offset-2 hover:text-[var(--accent)] hover:underline disabled:opacity-50"
        >
          Undo
        </button>
      </li>
    );
  }

  return (
    <li
      ref={liRef}
      className={`border-t border-[var(--line-soft)] py-2.5 first:border-t-0 ${focusRing}`}
      style={criticalEdge(priority)}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <h4 className="text-[0.85rem] font-medium leading-snug text-[var(--ink)]">{item.title}</h4>
        <PriorityLabel priority={priority} />
      </div>
      <MetaLine parts={[item.kind, item.projectBucket, item.createdAt]} />
      <p className="mt-0.5 text-[0.78rem] leading-snug text-[var(--ink-soft)]">{item.summary}</p>
      {item.nextStep && (
        <p className="mt-0.5 text-[0.78rem] leading-snug">
          <span className="font-medium text-[var(--accent)]">Next</span>{" "}
          <span className="text-[var(--ink-soft)]">{item.nextStep}</span>
        </p>
      )}
      <ChipRow people={item.people} tags={item.tags} />

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <select
          aria-label={`Project for ${item.title}`}
          value={bucket}
          onChange={(e) => setBucket(e.target.value)}
          disabled={pending}
          className="rounded border border-[var(--line)] bg-[var(--paper-raised)] px-1.5 py-0.5 text-[0.72rem] font-medium text-[var(--accent)] outline-none focus:border-[var(--accent)]"
        >
          {projects.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          aria-label={`Priority for ${item.title}`}
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          disabled={pending}
          className="rounded border border-[var(--line)] bg-[var(--paper-raised)] px-1.5 py-0.5 text-[0.72rem] font-medium capitalize outline-none focus:border-[var(--ink-soft)]"
          style={{ color: priority === "critical" ? "var(--critical)" : "var(--ink-soft)" }}
        >
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <DenseAction primary disabled={pending} onClick={doPrimary}>
          {item.suggestedAction === "keep_as_knowledge"
            ? "Keep"
            : item.suggestedAction === "dismiss"
              ? "Dismiss"
              : `File → ${bucket}`}
        </DenseAction>
        {item.suggestedAction !== "file" && (
          <DenseAction disabled={pending} onClick={doFile}>
            File → {bucket}
          </DenseAction>
        )}
        {item.suggestedAction !== "keep_as_knowledge" && (
          <DenseAction disabled={pending} onClick={doKeep}>
            Keep
          </DenseAction>
        )}
        {item.suggestedAction !== "dismiss" && (
          <DenseAction subtle disabled={pending} onClick={doDismiss}>
            Dismiss
          </DenseAction>
        )}
        {hasFullText && (
          <DenseAction subtle onClick={() => setShowFull((v) => !v)}>
            {showFull ? "Hide text" : "Text"}
          </DenseAction>
        )}
        {item.hasAudio && !audioUrl && (
          <DenseAction subtle disabled={pending} onClick={handlePlayAudio}>
            Audio
          </DenseAction>
        )}
      </div>

      {showFull && (
        <p className="mt-1.5 whitespace-pre-wrap rounded border border-[var(--line-soft)] bg-[var(--paper-raised)] px-2.5 py-2 text-[0.76rem] leading-relaxed text-[var(--ink-soft)]">
          {item.fullText}
        </p>
      )}
      {audioUrl && <audio controls autoPlay src={audioUrl} className="mt-1.5 h-8 w-full max-w-sm" />}
      {error && (
        <p className="mt-1 text-[0.72rem] text-[var(--clay)]">Couldn&rsquo;t save: {error}</p>
      )}
    </li>
  );
}

function DenseFiledRow({ item }: { item: VoiceInboxItem }) {
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

  const toggleArchive = (archive: boolean) => {
    setError(null);
    startTransition(async () => {
      const result = await (archive ? archiveCapture(item.id) : unarchiveCapture(item.id));
      if (result.ok) setArchived(archive);
      else setError(result.error);
    });
  };

  if (archived) {
    return (
      <li className="flex items-center gap-2 border-t border-[var(--line-soft)] py-1.5 first:border-t-0">
        <p className="min-w-0 flex-1 truncate text-[0.76rem] text-[var(--ink-faint)]">
          Archived — {item.title}
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => toggleArchive(false)}
          className="shrink-0 text-[0.7rem] font-medium text-[var(--ink-soft)] underline-offset-2 hover:text-[var(--accent)] hover:underline disabled:opacity-50"
        >
          Undo
        </button>
      </li>
    );
  }

  return (
    <li
      className="border-t border-[var(--line-soft)] py-2 first:border-t-0"
      style={criticalEdge(priority)}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <h4 className="text-[0.85rem] font-medium leading-snug text-[var(--ink)]">{item.title}</h4>
        <PriorityLabel priority={priority} />
        <span className="text-[0.7rem] text-[var(--ink-faint)]">{item.createdAt}</span>
      </div>
      {item.kind && <MetaLine parts={[item.kind]} />}
      <p className="mt-0.5 text-[0.78rem] leading-snug text-[var(--ink-soft)]">{item.summary}</p>
      {item.nextStep && (
        <p className="mt-0.5 text-[0.78rem] leading-snug">
          <span className="font-medium text-[var(--accent)]">Next</span>{" "}
          <span className="text-[var(--ink-soft)]">{item.nextStep}</span>
        </p>
      )}
      <ChipRow people={item.people} tags={item.tags} />

      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <select
          aria-label={`Priority for ${item.title}`}
          value={priority}
          onChange={(e) => handlePriorityChange(e.target.value as Priority)}
          disabled={pending}
          className="rounded border border-[var(--line)] bg-[var(--paper-raised)] px-1.5 py-0.5 text-[0.7rem] font-medium capitalize outline-none focus:border-[var(--ink-soft)]"
          style={{ color: priority === "critical" ? "var(--critical)" : "var(--ink-soft)" }}
        >
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        {hasFullText && (
          <DenseAction subtle onClick={() => setShowFull((v) => !v)}>
            {showFull ? "Hide text" : "Text"}
          </DenseAction>
        )}
        <DenseAction subtle disabled={pending} onClick={() => toggleArchive(true)}>
          Archive
        </DenseAction>
      </div>

      {showFull && (
        <p className="mt-1.5 whitespace-pre-wrap rounded border border-[var(--line-soft)] bg-[var(--paper-raised)] px-2.5 py-2 text-[0.76rem] leading-relaxed text-[var(--ink-soft)]">
          {item.fullText}
        </p>
      )}
      {error && (
        <p className="mt-1 text-[0.72rem] text-[var(--clay)]">Couldn&rsquo;t save: {error}</p>
      )}
    </li>
  );
}

function DenseAction({
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
  const style = primary
    ? "rounded bg-[var(--accent)] px-2 py-0.5 text-white hover:opacity-90"
    : subtle
      ? "text-[var(--ink-faint)] hover:text-[var(--clay)]"
      : "text-[var(--ink-soft)] underline-offset-2 hover:text-[var(--accent)] hover:underline";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-[0.72rem] font-medium transition-colors disabled:opacity-50 ${style}`}
    >
      {children}
    </button>
  );
}
