"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { KnowledgePacketItem } from "@/features/knowledge-packets/types";
import type { Project, ProjectDomain } from "@/features/projects/types";
import type { DashboardCounts } from "@/lib/dashboard-data";
import type { VoiceInboxItem, Priority } from "./types";
import { type ActionResult } from "./buckets";
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
import { type CaptureCardHandle } from "./capture-card";

/**
 * Overview — what the Detail toggle reveals. Not a denser inbox: a different
 * instrument. Full-width board, one column per project, everything visible at
 * once. Columns scroll internally; the page itself barely scrolls. The calm
 * editorial view stays the place to *decide*; this is the place to *see*.
 */

const PRIORITY_RANK: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

const DOMAIN_LABEL: Record<ProjectDomain, string> = {
  work: "work",
  personal: "personal",
  jesseos: "system",
};

const DOMAIN_COLOR: Record<ProjectDomain, string> = {
  work: "var(--accent)",
  personal: "var(--amber)",
  jesseos: "var(--ink-faint)",
};

type OverviewBoardProps = {
  projects: Project[];
  pending: VoiceInboxItem[]; // already priority/project-filtered by the caller
  filedItems: VoiceInboxItem[];
  knowledgeItems: KnowledgePacketItem[];
  counts: DashboardCounts;
  projectNames: string[];
  priorityFilter: "all" | Priority;
  onPriorityFilter: (p: "all" | Priority) => void;
  focusedId: string | null;
  registerHandle: (id: string, handle: CaptureCardHandle | null) => void;
  onRefresh: () => void;
  onExit: () => void;
};

export function OverviewBoard({
  projects,
  pending,
  filedItems,
  knowledgeItems,
  counts,
  projectNames,
  priorityFilter,
  onPriorityFilter,
  focusedId,
  registerHandle,
  onRefresh,
  onExit,
}: OverviewBoardProps) {
  const pendingBy = groupBy(pending);
  const filedBy = groupBy(filedItems);

  // Every bucket that appears anywhere, mapped onto known projects for domain
  // info; ordered by how much is waiting in them.
  const bucketNames = Array.from(
    new Set([...projects.map((p) => p.name), ...pendingBy.keys(), ...filedBy.keys()]),
  );
  const columns = bucketNames
    .map((name) => ({
      name,
      project: projects.find((p) => p.name === name),
      pending: pendingBy.get(name) ?? [],
      filed: filedBy.get(name) ?? [],
    }))
    .filter((c) => c.pending.length > 0 || c.filed.length > 0)
    .sort(
      (a, b) =>
        b.pending.length - a.pending.length ||
        b.filed.length - a.filed.length ||
        a.name.localeCompare(b.name),
    );
  const quietProjects = projects.filter(
    (p) => !columns.some((c) => c.name === p.name),
  );

  const criticalItems = [...pending, ...filedItems].filter((i) => i.priority === "critical");

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* command bar */}
      <header className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 border-b border-[var(--line)] px-5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-md bg-[var(--ink)] text-[0.62rem] font-semibold tracking-tight text-[var(--paper)]">
            JO
          </span>
          <span className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            Overview
          </span>
        </div>

        <div className="flex items-baseline gap-4 text-[0.75rem] text-[var(--ink-soft)]">
          <BarStat value={counts.pendingReview} label="to review" strong />
          <BarStat value={counts.filed} label="filed" />
          <BarStat value={counts.knowledge} label="knowledge" />
          <BarStat value={counts.captured} label="all-time" />
        </div>

        <div className="flex items-center gap-1">
          {(["all", "critical", "high", "medium", "low"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPriorityFilter(p)}
              className={`rounded-full px-2 py-0.5 text-[0.68rem] font-medium capitalize transition-colors ${
                priorityFilter === p
                  ? p === "critical"
                    ? "bg-[var(--critical)] text-white"
                    : "bg-[var(--ink)] text-[var(--paper)]"
                  : p === "critical"
                    ? "text-[var(--critical)] hover:bg-[var(--paper-raised)]"
                    : "text-[var(--ink-faint)] hover:bg-[var(--paper-raised)] hover:text-[var(--ink-soft)]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-[0.68rem] text-[var(--ink-faint)] lg:inline">
            j/k · f accept · x dismiss
          </span>
          <button
            type="button"
            onClick={onRefresh}
            className="text-[0.72rem] font-medium text-[var(--ink-faint)] transition-colors hover:text-[var(--accent)]"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={onExit}
            aria-pressed={true}
            className="flex items-center gap-1.5 rounded-full border border-[var(--ink)] bg-[var(--ink)] px-2.5 py-1 text-[0.72rem] font-medium text-[var(--paper)]"
          >
            <span className="size-1.5 rounded-full bg-[var(--paper)]" />
            Detail
          </button>
        </div>
      </header>

      {/* critical strip — only exists when something is critical */}
      {criticalItems.length > 0 && (
        <div
          className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-[#ecd4d1] px-5 py-1.5"
          style={{ background: "#fbf0ef" }}
        >
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[var(--critical)]">
            Critical {criticalItems.length}
          </span>
          {criticalItems.map((i) => (
            <span key={i.id} className="text-[0.72rem] font-medium text-[var(--critical)]">
              {i.title}
            </span>
          ))}
        </div>
      )}

      {/* the board */}
      <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto px-5 py-4">
        {columns.map((col) => (
          <BoardColumn
            key={col.name}
            name={col.name}
            domain={col.project?.domain ?? null}
            pending={col.pending}
            filed={col.filed}
            projectNames={projectNames}
            focusedId={focusedId}
            registerHandle={registerHandle}
          />
        ))}

        {knowledgeItems.length > 0 && (
          <section className="flex w-60 shrink-0 flex-col rounded-xl border border-[var(--line-soft)] bg-[var(--paper-raised)]/60">
            <ColumnHeader name="knowledge" domain={null} badge={knowledgeItems.length} />
            <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-3">
              {knowledgeItems.map((k) => (
                <div key={k.id} className="border-t border-[var(--line-soft)] py-2 first:border-t-0">
                  <p className="text-[0.76rem] font-medium leading-snug text-[var(--ink)]">
                    {k.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[0.7rem] leading-snug text-[var(--ink-soft)]">
                    {k.summary}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {quietProjects.length > 0 && (
          <div className="flex w-44 shrink-0 flex-col gap-2 pt-1">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              Quiet
            </p>
            {quietProjects.map((p) => (
              <div
                key={p.id}
                className="rounded-lg border border-dashed border-[var(--line)] px-2.5 py-2"
              >
                <p className="text-[0.74rem] font-medium text-[var(--ink-soft)]">{p.name}</p>
                <p className="text-[0.65rem] text-[var(--ink-faint)]">nothing waiting</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function groupBy(items: VoiceInboxItem[]): Map<string, VoiceInboxItem[]> {
  const map = new Map<string, VoiceInboxItem[]>();
  for (const item of items) {
    const list = map.get(item.projectBucket) ?? [];
    list.push(item);
    map.set(item.projectBucket, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  }
  return map;
}

function BarStat({ value, label, strong }: { value: number; label: string; strong?: boolean }) {
  return (
    <span className="whitespace-nowrap">
      <span
        className={`tabular-nums ${
          strong && value > 0
            ? "font-semibold text-[var(--ink)]"
            : "font-medium text-[var(--ink-soft)]"
        }`}
      >
        {value}
      </span>{" "}
      <span className="text-[var(--ink-faint)]">{label}</span>
    </span>
  );
}

function ColumnHeader({
  name,
  domain,
  badge,
}: {
  name: string;
  domain: ProjectDomain | null;
  badge: number;
}) {
  return (
    <div className="flex items-center gap-2 px-3 pb-1.5 pt-2.5">
      <h2 className="text-[0.8rem] font-semibold text-[var(--ink)]">{name}</h2>
      {domain && (
        <span
          className="text-[0.62rem] font-medium uppercase tracking-[0.1em]"
          style={{ color: DOMAIN_COLOR[domain] }}
        >
          {DOMAIN_LABEL[domain]}
        </span>
      )}
      <span
        className={`ml-auto rounded-full px-1.5 text-[0.68rem] font-semibold tabular-nums ${
          badge > 0 ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--ink-faint)]"
        }`}
      >
        {badge}
      </span>
    </div>
  );
}

function BoardColumn({
  name,
  domain,
  pending,
  filed,
  projectNames,
  focusedId,
  registerHandle,
}: {
  name: string;
  domain: ProjectDomain | null;
  pending: VoiceInboxItem[];
  filed: VoiceInboxItem[];
  projectNames: string[];
  focusedId: string | null;
  registerHandle: (id: string, handle: CaptureCardHandle | null) => void;
}) {
  return (
    <section className="flex w-72 shrink-0 flex-col rounded-xl border border-[var(--line)] bg-[var(--paper-raised)]">
      <ColumnHeader name={name} domain={domain} badge={pending.length} />
      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-3">
        {pending.length > 0 && (
          <>
            <SectionTag tone="accent">needs you · {pending.length}</SectionTag>
            {pending.map((item) => (
              <BoardCard
                key={item.id}
                item={item}
                mode="review"
                projectNames={projectNames}
                focused={focusedId === item.id}
                registerHandle={registerHandle}
              />
            ))}
          </>
        )}
        {filed.length > 0 && (
          <>
            <SectionTag>filed · {filed.length}</SectionTag>
            {filed.map((item) => (
              <BoardCard key={item.id} item={item} mode="filed" projectNames={projectNames} />
            ))}
          </>
        )}
      </div>
    </section>
  );
}

function SectionTag({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "accent";
}) {
  return (
    <p
      className={`mb-1 mt-2.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] first:mt-1 ${
        tone === "accent" ? "text-[var(--accent)]" : "text-[var(--ink-faint)]"
      }`}
    >
      {children}
    </p>
  );
}

const PRIORITY_BAR: Record<Priority, string> = {
  critical: "var(--critical)",
  high: "var(--clay)",
  medium: "var(--amber)",
  low: "var(--line)",
};

/**
 * One capture on the board. Collapsed: two lines and a priority bar — built
 * for scanning. Click to open it in place with full detail and actions.
 */
function BoardCard({
  item,
  mode,
  projectNames,
  focused,
  registerHandle,
}: {
  item: VoiceInboxItem;
  mode: "review" | "filed";
  projectNames: string[];
  focused?: boolean;
  registerHandle?: (id: string, handle: CaptureCardHandle | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [bucket, setBucket] = useState(
    projectNames.includes(item.projectBucket) ? item.projectBucket : "unsorted",
  );
  const [priority, setPriority] = useState<Priority>(item.priority);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<null | "filed" | "dismissed" | "kept" | "archived">(null);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

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
      const result = await (done === "archived" ? unarchiveCapture(item.id) : undoReview(item.id));
      if (result.ok) setDone(null);
      else setError(result.error);
    });
  };

  // Keyboard contract — review cards only.
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
    if (!registerHandle || mode !== "review") return;
    const stable: CaptureCardHandle = {
      primary: () => handleRef.current.primary(),
      keep: () => handleRef.current.keep(),
      dismiss: () => handleRef.current.dismiss(),
      undo: () => handleRef.current.undo(),
    };
    registerHandle(item.id, stable);
    return () => registerHandle(item.id, null);
  }, [item.id, mode, registerHandle]);

  useEffect(() => {
    if (focused) cardRef.current?.scrollIntoView({ block: "nearest" });
  }, [focused]);

  const handleFiledPriority = (next: Priority) => {
    setPriority(next);
    setError(null);
    startTransition(async () => {
      const result = await updatePriority(item.id, next);
      if (!result.ok) setError(result.error);
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

  if (done) {
    const label =
      done === "filed"
        ? "Filed"
        : done === "kept"
          ? "Kept"
          : done === "archived"
            ? "Archived"
            : "Dismissed";
    return (
      <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[0.72rem] text-[var(--ink-faint)]">
        <span className="min-w-0 flex-1 truncate">
          <span className="text-[var(--accent)]">✓</span> {label} — {item.title}
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={handleUndo}
          className="shrink-0 font-medium text-[var(--ink-soft)] underline-offset-2 hover:text-[var(--accent)] hover:underline disabled:opacity-50"
        >
          Undo
        </button>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className={`mb-1 rounded-lg border transition-colors ${
        focused
          ? "border-[var(--accent)]/50 bg-[var(--accent-soft)]/70"
          : open
            ? "border-[var(--line)] bg-[var(--paper)]"
            : "border-transparent hover:border-[var(--line)] hover:bg-[var(--paper)]"
      }`}
      style={{ borderLeft: `3px solid ${PRIORITY_BAR[priority]}` }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="block w-full px-2 py-1.5 text-left"
      >
        <span
          className={`block text-[0.76rem] font-medium leading-snug text-[var(--ink)] ${
            open ? "" : "line-clamp-2"
          }`}
        >
          {item.title}
        </span>
        <span className="mt-0.5 block text-[0.65rem] leading-snug text-[var(--ink-faint)]">
          {[priority !== "low" ? priority : null, item.kind, item.createdAt]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </button>

      {open && (
        <div className="px-2 pb-2">
          <p className="text-[0.72rem] leading-snug text-[var(--ink-soft)]">{item.summary}</p>
          {item.nextStep && (
            <p className="mt-1 text-[0.72rem] leading-snug">
              <span className="font-medium text-[var(--accent)]">Next</span>{" "}
              <span className="text-[var(--ink-soft)]">{item.nextStep}</span>
            </p>
          )}
          {(item.people.length > 0 || item.tags.length > 0) && (
            <div className="mt-1 flex flex-wrap gap-1">
              {item.people.map((p) => (
                <span
                  key={`p-${p}`}
                  className="rounded-full bg-[var(--accent-soft)] px-1.5 py-px text-[0.65rem] font-medium text-[var(--accent)]"
                >
                  {p}
                </span>
              ))}
              {item.tags.map((t) => (
                <span
                  key={`t-${t}`}
                  className="rounded-full border border-[var(--line-soft)] px-1.5 py-px text-[0.65rem] text-[var(--ink-faint)]"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {mode === "review" ? (
            <>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <select
                  aria-label={`Project for ${item.title}`}
                  value={bucket}
                  onChange={(e) => setBucket(e.target.value)}
                  disabled={pending}
                  className="rounded border border-[var(--line)] bg-[var(--paper-raised)] px-1 py-0.5 text-[0.68rem] font-medium text-[var(--accent)] outline-none"
                >
                  {projectNames.map((b) => (
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
                  className="rounded border border-[var(--line)] bg-[var(--paper-raised)] px-1 py-0.5 text-[0.68rem] font-medium capitalize outline-none"
                  style={{ color: priority === "critical" ? "var(--critical)" : "var(--ink-soft)" }}
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={doPrimary}
                  className="rounded bg-[var(--accent)] px-2 py-0.5 text-[0.7rem] font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {item.suggestedAction === "keep_as_knowledge"
                    ? "Keep"
                    : item.suggestedAction === "dismiss"
                      ? "Dismiss"
                      : `File → ${bucket}`}
                </button>
                {item.suggestedAction !== "file" && (
                  <BoardTextButton disabled={pending} onClick={doFile}>
                    File
                  </BoardTextButton>
                )}
                {item.suggestedAction !== "keep_as_knowledge" && (
                  <BoardTextButton disabled={pending} onClick={doKeep}>
                    Keep
                  </BoardTextButton>
                )}
                {item.suggestedAction !== "dismiss" && (
                  <BoardTextButton subtle disabled={pending} onClick={doDismiss}>
                    Dismiss
                  </BoardTextButton>
                )}
                {item.hasAudio && !audioUrl && (
                  <BoardTextButton subtle disabled={pending} onClick={handlePlayAudio}>
                    Audio
                  </BoardTextButton>
                )}
              </div>
            </>
          ) : (
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <select
                aria-label={`Priority for ${item.title}`}
                value={priority}
                onChange={(e) => handleFiledPriority(e.target.value as Priority)}
                disabled={pending}
                className="rounded border border-[var(--line)] bg-[var(--paper-raised)] px-1 py-0.5 text-[0.68rem] font-medium capitalize outline-none"
                style={{ color: priority === "critical" ? "var(--critical)" : "var(--ink-soft)" }}
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <BoardTextButton subtle disabled={pending} onClick={() => run(() => archiveCapture(item.id), "archived")}>
                Archive
              </BoardTextButton>
              {item.hasAudio && !audioUrl && (
                <BoardTextButton subtle disabled={pending} onClick={handlePlayAudio}>
                  Audio
                </BoardTextButton>
              )}
            </div>
          )}

          {audioUrl && (
            <audio controls autoPlay src={audioUrl} className="mt-1.5 h-8 w-full" />
          )}
          {error && (
            <p className="mt-1 text-[0.68rem] text-[var(--clay)]">Couldn&rsquo;t save: {error}</p>
          )}
        </div>
      )}
    </div>
  );
}

function BoardTextButton({
  children,
  onClick,
  disabled,
  subtle,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  subtle?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-[0.7rem] font-medium transition-colors disabled:opacity-50 ${
        subtle
          ? "text-[var(--ink-faint)] hover:text-[var(--clay)]"
          : "text-[var(--ink-soft)] underline-offset-2 hover:text-[var(--accent)] hover:underline"
      }`}
    >
      {children}
    </button>
  );
}
