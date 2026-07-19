"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DashboardData } from "@/lib/dashboard-data";
import type { VoiceInboxItem, Priority } from "@/features/voice-inbox/types";
import type { KnowledgePacketItem } from "@/features/knowledge-packets/types";
import { CaptureCard, type CaptureCardHandle } from "@/features/voice-inbox/capture-card";
import { FiledRow } from "@/features/voice-inbox/filed-row";
import { DenseView } from "@/features/voice-inbox/dense-view";

type View = "review" | "filed" | "knowledge";

const DETAIL_STORAGE_KEY = "jesseos-detail-view";

export const PRIORITY_RANK: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function DashboardClient({ data }: { data: DashboardData }) {
  const [view, setView] = useState<View>("review");
  const [priority, setPriority] = useState<"all" | Priority>("all");
  const [project, setProject] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(data.counts.pendingReview > 15);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [showKeyHints, setShowKeyHints] = useState(false);
  const [detail, setDetail] = useState(false);
  const router = useRouter();

  // Detail mode persists across visits; read after mount so SSR markup stays stable.
  useEffect(() => {
    setDetail(localStorage.getItem(DETAIL_STORAGE_KEY) === "1");
  }, []);
  const toggleDetail = () => {
    setDetail((v) => {
      localStorage.setItem(DETAIL_STORAGE_KEY, v ? "0" : "1");
      return !v;
    });
  };

  const projectNames = useMemo(() => data.projects.map((p) => p.name), [data.projects]);

  const projectsInInbox = useMemo(
    () => Array.from(new Set(data.voiceInboxItems.map((i) => i.projectBucket))).sort(),
    [data.voiceInboxItems],
  );

  const pending = useMemo(() => {
    return data.voiceInboxItems
      .filter((i) => (priority === "all" ? true : i.priority === priority))
      .filter((i) => (project === "all" ? true : i.projectBucket === project))
      .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  }, [data.voiceInboxItems, priority, project]);

  const filedByProject = useMemo(() => groupByProject(data.filedItems), [data.filedItems]);

  // --- keyboard triage (desktop): j/k move, f file-as-suggested, g keep, x dismiss, u undo ---
  const handlesRef = useRef(new Map<string, CaptureCardHandle>());
  const registerHandle = useCallback((id: string, handle: CaptureCardHandle | null) => {
    if (handle) handlesRef.current.set(id, handle);
    else handlesRef.current.delete(id);
  }, []);

  const pendingIdsRef = useRef<string[]>([]);
  const focusedIdRef = useRef<string | null>(null);
  useEffect(() => {
    pendingIdsRef.current = pending.map((i) => i.id);
    focusedIdRef.current = focusedId;
  });

  useEffect(() => {
    if (!detail && view !== "review") return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "SELECT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const ids = pendingIdsRef.current;
      if (ids.length === 0) return;

      const move = (delta: 1 | -1) => {
        e.preventDefault();
        setFocusedId((current) => {
          const idx = current ? ids.indexOf(current) : -1;
          if (idx === -1) return delta === 1 ? ids[0] : ids[ids.length - 1];
          const next = Math.min(Math.max(idx + delta, 0), ids.length - 1);
          return ids[next];
        });
      };

      switch (e.key) {
        case "j":
        case "ArrowDown":
          move(1);
          break;
        case "k":
        case "ArrowUp":
          move(-1);
          break;
        case "Escape":
          setFocusedId(null);
          break;
        case "?":
          setShowKeyHints((v) => !v);
          break;
        case "f":
        case "g":
        case "x":
        case "u": {
          const current = focusedIdRef.current;
          const handle = current ? handlesRef.current.get(current) : undefined;
          if (!handle) break;
          e.preventDefault();
          if (e.key === "f") handle.primary();
          else if (e.key === "g") handle.keep();
          else if (e.key === "x") handle.dismiss();
          else handle.undo();
          break;
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [view, detail]);

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="mx-auto w-full max-w-[48rem] px-6 py-14 sm:py-20">
        {/* wordmark */}
        <div className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-md bg-[var(--ink)] text-[0.7rem] font-semibold tracking-tight text-[var(--paper)]">
            JO
          </span>
          <span className="text-[0.78rem] font-medium uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            JesseOS
          </span>
        </div>

        {/* hero */}
        <header className="mt-12">
          <p className="text-[0.82rem] font-medium uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            Inbox
          </p>
          <h1 className="mt-4 text-[2.4rem] font-semibold leading-[1.12] tracking-[-0.02em] text-[var(--ink)] sm:text-[2.9rem]">
            {data.counts.pendingReview > 0 ? (
              <>
                {data.counts.pendingReview}{" "}
                {data.counts.pendingReview === 1 ? "thing is" : "things are"}
                <br />
                waiting for you.
              </>
            ) : (
              <>You&rsquo;re all caught up.</>
            )}
          </h1>
          <p className="mt-5 max-w-md text-[1.02rem] leading-relaxed text-[var(--ink-soft)]">
            Everything you capture lands here first — deciphered and sorted, ready for
            a quick decision before it goes into a project.
          </p>
        </header>

        {/* quiet stats */}
        <dl className="mt-11 flex flex-wrap gap-x-10 gap-y-4 border-y border-[var(--line)] py-6">
          {data.dashboardStats.map((stat) => (
            <div key={stat.label}>
              <dt className="text-[0.72rem] font-medium uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                {stat.label}
              </dt>
              <dd className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums tracking-tight text-[var(--ink)]">
                  {stat.value}
                </span>
                <span className="text-[0.78rem] text-[var(--ink-soft)]">{stat.detail}</span>
              </dd>
            </div>
          ))}
        </dl>

        {data.dataStatus && (
          <p className="mt-6 rounded-lg border border-[var(--line)] bg-[var(--paper-raised)] px-4 py-3 text-[0.85rem] text-[var(--ink-soft)]">
            {data.dataStatus}
          </p>
        )}

        {/* view switcher + detail toggle */}
        <div className="mt-12 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-[var(--line)]">
          {detail ? (
            <div className="flex gap-5 pb-3 text-[0.85rem] font-medium">
              <a href="#dense-review" className="text-[var(--ink-soft)] hover:text-[var(--ink)]">
                To review <Count>{data.counts.pendingReview}</Count>
              </a>
              <a href="#dense-filed" className="text-[var(--ink-soft)] hover:text-[var(--ink)]">
                Filed <Count>{data.counts.filed}</Count>
              </a>
              <a href="#dense-knowledge" className="text-[var(--ink-soft)] hover:text-[var(--ink)]">
                Knowledge <Count>{data.counts.knowledge}</Count>
              </a>
            </div>
          ) : (
            <nav className="flex gap-6">
              <Tab active={view === "review"} onClick={() => setView("review")}>
                To review <Count>{data.counts.pendingReview}</Count>
              </Tab>
              <Tab active={view === "filed"} onClick={() => setView("filed")}>
                Filed <Count>{data.counts.filed}</Count>
              </Tab>
              <Tab active={view === "knowledge"} onClick={() => setView("knowledge")}>
                Knowledge <Count>{data.counts.knowledge}</Count>
              </Tab>
            </nav>
          )}
          <div className="flex items-center gap-3 pb-3">
            {detail && (
              <button
                type="button"
                onClick={() => router.refresh()}
                className="text-[0.75rem] font-medium text-[var(--ink-faint)] transition-colors hover:text-[var(--accent)]"
              >
                Refresh
              </button>
            )}
            <button
              type="button"
              onClick={toggleDetail}
              aria-pressed={detail}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.75rem] font-medium transition-colors ${
                detail
                  ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]"
                  : "border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--ink-soft)]"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  detail ? "bg-[var(--paper)]" : "bg-[var(--ink-faint)]"
                }`}
              />
              Detail
            </button>
          </div>
        </div>

        {/* filters — shown for the review list in both modes */}
        {(detail || view === "review") && (
          <div className="mt-7 flex flex-col gap-3 border-b border-[var(--line-soft)] pb-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                aria-expanded={showFilters}
                className="text-[0.78rem] font-medium text-[var(--ink-faint)] transition-colors hover:text-[var(--accent)]"
              >
                {showFilters ? "Hide filters" : "Filter"}
                {!showFilters && (priority !== "all" || project !== "all") && (
                  <span className="ml-1 text-[var(--accent)]">·</span>
                )}
              </button>
              <span className="hidden text-[0.72rem] text-[var(--ink-faint)] sm:inline">
                {showKeyHints
                  ? "j/k move · f accept · g keep · x dismiss · u undo · esc clear"
                  : "? for keyboard shortcuts"}
              </span>
            </div>
            {showFilters && (
              <>
                <FilterRow label="Priority">
                  <Chip active={priority === "all"} onClick={() => setPriority("all")}>
                    All
                  </Chip>
                  {(["critical", "high", "medium", "low"] as Priority[]).map((p) => (
                    <Chip
                      key={p}
                      active={priority === p}
                      critical={p === "critical"}
                      onClick={() => setPriority(p)}
                    >
                      {p}
                    </Chip>
                  ))}
                </FilterRow>
                {projectsInInbox.length > 1 && (
                  <FilterRow label="Project">
                    <select
                      value={project}
                      onChange={(e) => setProject(e.target.value)}
                      className="rounded-full border border-[var(--line)] bg-[var(--paper-raised)] px-3 py-1 text-[0.78rem] font-medium text-[var(--ink-soft)] outline-none focus:border-[var(--ink-soft)]"
                    >
                      <option value="all">All projects ({data.voiceInboxItems.length})</option>
                      {projectsInInbox.map((p) => (
                        <option key={p} value={p}>
                          {p || "(untagged)"}
                        </option>
                      ))}
                    </select>
                  </FilterRow>
                )}
              </>
            )}
          </div>
        )}

        {/* DETAIL — the whole system on one dense page */}
        {detail && (
          <DenseView
            pending={pending}
            filedByProject={filedByProject}
            knowledgeItems={data.knowledgePacketItems}
            projectNames={projectNames}
            focusedId={focusedId}
            registerHandle={registerHandle}
            reviewError={data.sectionErrors.voiceInbox}
          />
        )}

        {/* REVIEW */}
        {!detail && view === "review" && (
          <section className="mt-2">
            {data.sectionErrors.voiceInbox ? (
              <ErrorLine message={data.sectionErrors.voiceInbox} />
            ) : pending.length === 0 ? (
              <EmptyLine>
                {data.counts.pendingReview === 0
                  ? "Nothing to review — you're clear."
                  : "Nothing matches these filters."}
              </EmptyLine>
            ) : (
              <ul className="mt-1">
                {pending.map((item) => (
                  <CaptureCard
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
        )}

        {/* FILED */}
        {!detail && view === "filed" && (
          <section className="mt-7">
            {data.filedItems.length === 0 ? (
              <EmptyLine>Nothing filed yet. File a capture and it lands here.</EmptyLine>
            ) : (
              <div className="space-y-9">
                {filedByProject.map(([bucket, items]) => (
                  <div key={bucket}>
                    <h2 className="mb-2 flex items-baseline gap-2 text-[0.82rem] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                      {bucket}
                      <span className="text-[var(--ink-faint)]">{items.length}</span>
                    </h2>
                    <ul>
                      {items.map((item) => (
                        <FiledRow key={item.id} item={item} />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* KNOWLEDGE */}
        {!detail && view === "knowledge" && (
          <section className="mt-7">
            {data.knowledgePacketItems.length === 0 ? (
              <EmptyLine>No knowledge kept yet.</EmptyLine>
            ) : (
              <ul>
                {data.knowledgePacketItems.map((item) => (
                  <KnowledgeRow key={item.id} item={item} />
                ))}
              </ul>
            )}
          </section>
        )}

        <footer className="mt-16 border-t border-[var(--line)] pt-6 text-[0.78rem] text-[var(--ink-faint)]">
          Capture · review · remember.
        </footer>
      </div>
    </main>
  );
}

function groupByProject(items: VoiceInboxItem[]): [string, VoiceInboxItem[]][] {
  const map = new Map<string, VoiceInboxItem[]>();
  for (const item of items) {
    const list = map.get(item.projectBucket) ?? [];
    list.push(item);
    map.set(item.projectBucket, list);
  }
  const groups = Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  for (const [, items] of groups) {
    items.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  }
  return groups;
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 pb-3 text-[0.92rem] font-medium transition-colors ${
        active
          ? "border-[var(--ink)] text-[var(--ink)]"
          : "border-transparent text-[var(--ink-faint)] hover:text-[var(--ink-soft)]"
      }`}
    >
      {children}
    </button>
  );
}

function Count({ children }: { children: React.ReactNode }) {
  return <span className="ml-1 text-[0.8rem] tabular-nums text-[var(--ink-faint)]">{children}</span>;
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-[0.72rem] font-medium uppercase tracking-[0.1em] text-[var(--ink-faint)]">
        {label}
      </span>
      {children}
    </div>
  );
}

function Chip({
  active,
  critical,
  onClick,
  children,
}: {
  active: boolean;
  critical?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const activeStyle = critical
    ? "bg-[var(--critical)] text-white"
    : "bg-[var(--ink)] text-[var(--paper)]";
  const idleStyle = critical
    ? "border border-[var(--line)] text-[var(--critical)] hover:border-[var(--critical)]"
    : "border border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--ink-soft)]";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-[0.78rem] font-medium capitalize transition-colors ${
        active ? activeStyle : idleStyle
      }`}
    >
      {children}
    </button>
  );
}

function KnowledgeRow({ item }: { item: KnowledgePacketItem }) {
  return (
    <li className="border-t border-[var(--line-soft)] py-3.5 first:border-t-0">
      <h3 className="text-[0.95rem] font-medium leading-snug text-[var(--ink)]">{item.title}</h3>
      <p className="mt-1 line-clamp-2 text-[0.82rem] leading-relaxed text-[var(--ink-soft)]">
        {item.summary}
      </p>
    </li>
  );
}

function ErrorLine({ message }: { message: string }) {
  return (
    <p className="mt-3 rounded-lg border border-[#e7d3cc] bg-[#fbf1ee] px-3.5 py-2.5 text-[0.85rem] text-[var(--clay)]">
      {message}
    </p>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-[0.9rem] text-[var(--ink-faint)]">{children}</p>;
}
