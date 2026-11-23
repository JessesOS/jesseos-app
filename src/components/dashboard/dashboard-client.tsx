"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DashboardData } from "@/lib/dashboard-data";
import type { VoiceInboxItem, Priority } from "@/features/voice-inbox/types";
import type { KnowledgePacketItem } from "@/features/knowledge-packets/types";
import { CaptureCard, type CaptureCardHandle } from "@/features/voice-inbox/capture-card";
import { FiledRow } from "@/features/voice-inbox/filed-row";
import { OverviewBoard } from "@/features/voice-inbox/overview-board";

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

  // Detail ON: the calm inbox steps aside entirely — full-width overview board.
  if (detail) {
    return (
      <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
        <OverviewBoard
          projects={data.projects}
          pending={pending}
          filedItems={data.filedItems}
          knowledgeItems={data.knowledgePacketItems}
          counts={data.counts}
          projectNames={projectNames}
          priorityFilter={priority}
          onPriorityFilter={setPriority}
          focusedId={focusedId}
          registerHandle={registerHandle}
          onRefresh={() => router.refresh()}
          onExit={toggleDetail}
        />
      </main>
    );
  }

  const criticalCount = data.voiceInboxItems.filter((i) => i.priority === "critical").length;
  const newest = data.voiceInboxItems[0]?.createdAt;
  const viewTitle = view === "review" ? "To review" : view === "filed" ? "Filed" : "Knowledge";
  const projectCounts = countByProject([...data.voiceInboxItems, ...data.filedItems]);

  const reviewNext = () => {
    setView("review");
    const first = pending[0];
    if (!first) return;
    setFocusedId(first.id); // the card scrolls itself into view when focused
  };

  const pickProject = (name: string) => {
    setView("review");
    setProject((current) => (current === name ? "all" : name));
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      {/* top bar */}
      <header className="sticky top-0 z-10 flex h-16 items-center gap-5 border-b border-[var(--line)] bg-[var(--paper-raised)] px-5 sm:px-7">
        <span className="flex items-center gap-2.5 text-[1.2rem] font-bold tracking-[-0.02em]">
          <Logo />
          JesseOS
        </span>
        <span className="flex-1" />
        <span className="grid size-[30px] place-items-center rounded-full border border-[var(--line)] bg-[var(--paper)] text-[0.8rem] font-semibold">
          J
        </span>
      </header>

      <div className="md:grid md:grid-cols-[240px_1fr]">
        {/* left menu */}
        <nav className="hidden border-r border-[var(--line)] px-4 py-7 md:block">
          <MenuGroup label="Voice inbox">
            <MenuItem active={view === "review"} onClick={() => setView("review")} badge={data.counts.pendingReview}>
              To review
            </MenuItem>
            <MenuItem active={view === "filed"} onClick={() => setView("filed")} count={data.counts.filed}>
              Filed
            </MenuItem>
            <MenuItem active={view === "knowledge"} onClick={() => setView("knowledge")} count={data.counts.knowledge}>
              Knowledge
            </MenuItem>
            <MenuItem active={false} onClick={toggleDetail}>
              Board
            </MenuItem>
          </MenuGroup>
          <MenuGroup label="Projects">
            {projectCounts.map(([name, n]) => (
              <MenuItem
                key={name}
                active={view === "review" && project === name}
                onClick={() => pickProject(name)}
                count={n}
              >
                {name || "Not placed"}
              </MenuItem>
            ))}
          </MenuGroup>
        </nav>

        <main className="mx-auto w-full max-w-[1100px] px-5 pb-20 pt-6 sm:px-10">
          {/* breadcrumb */}
          <div className="flex gap-2 border-b border-[var(--line)] pb-3.5 text-[0.84rem] text-[var(--ink-faint)]">
            Voice inbox <span>/</span> <b className="font-medium text-[var(--ink)]">{viewTitle}</b>
            <span className="flex-1" />
            {newest && <span className="hidden sm:inline">Last note {newest}</span>}
          </div>

          {/* banner */}
          <div className="mb-6 mt-4 flex flex-col gap-1 rounded-[10px] bg-[var(--banner)] px-6 py-4 sm:flex-row sm:items-center sm:gap-5">
            <span className="mono text-[var(--ink-soft)]">Voice inbox</span>
            <div>
              <h3 className="text-[1.1rem] font-medium tracking-[-0.01em]">Talk into your phone. It lands here.</h3>
              <p className="mt-0.5 text-[0.875rem] text-[var(--ink-soft)]">
                Each note gets a title, a project and a next step. File it, or dismiss it.
              </p>
            </div>
          </div>

          {/* title */}
          <div className="mb-5 flex flex-wrap items-end gap-4">
            <div>
              <div className="mono mb-1.5 text-[var(--ink-faint)]">Jesse&rsquo;s notes</div>
              <h1 className="text-[1.875rem] font-medium tracking-[-0.02em]">{viewTitle}</h1>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <Pill>{data.counts.pendingReview} waiting</Pill>
                <Pill>{data.counts.filed} filed</Pill>
                {criticalCount > 0 && <Pill critical>{criticalCount} critical</Pill>}
              </div>
            </div>
            <span className="flex-1" />
            {view === "review" && (
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                aria-expanded={showFilters}
                className="px-3 py-2.5 text-[0.875rem] text-[var(--ink-soft)] hover:text-[var(--ink)]"
              >
                {showFilters ? "Hide filters" : "Filters"}
                {!showFilters && priority !== "all" && <span className="ml-1 text-[var(--accent)]">·</span>}
              </button>
            )}
            <button
              type="button"
              onClick={reviewNext}
              disabled={pending.length === 0}
              className="rounded-lg bg-[var(--btn)] px-[18px] py-2.5 text-[0.875rem] font-medium text-white disabled:bg-[#c9ccd3]"
            >
              Review next
            </button>
          </div>

          {data.dataStatus && (
            <p className="mb-5 rounded-[10px] border border-[var(--line)] bg-[var(--paper-raised)] px-4 py-3 text-[0.85rem] text-[var(--ink-soft)]">
              {data.dataStatus}
            </p>
          )}

          {/* phone: view switch (the left menu is hidden on small screens) */}
          <div className="mb-4 flex gap-2 md:hidden">
            <Chip active={view === "review"} onClick={() => setView("review")}>To review {data.counts.pendingReview}</Chip>
            <Chip active={view === "filed"} onClick={() => setView("filed")}>Filed {data.counts.filed}</Chip>
            <Chip active={false} onClick={toggleDetail}>Board</Chip>
          </div>

          {/* filters */}
          {view === "review" && (
            <div className="mb-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Chip active={project === "all"} onClick={() => setProject("all")}>
                  All <b className="ml-1.5 font-medium opacity-60">{data.voiceInboxItems.length}</b>
                </Chip>
                {projectsInInbox.map((p) => (
                  <Chip key={p} active={project === p} onClick={() => setProject(p)}>
                    {p || "Not placed"}{" "}
                    <b className="ml-1.5 font-medium opacity-60">
                      {data.voiceInboxItems.filter((i) => i.projectBucket === p).length}
                    </b>
                  </Chip>
                ))}
                <span className="ml-auto hidden text-[0.78rem] text-[var(--ink-faint)] sm:inline">
                  {showKeyHints ? (
                    <>
                      <Kbd>J</Kbd><Kbd>K</Kbd> move <Kbd>F</Kbd> file <Kbd>G</Kbd> keep <Kbd>X</Kbd> dismiss <Kbd>U</Kbd> undo
                    </>
                  ) : (
                    <>
                      <Kbd>?</Kbd> keyboard shortcuts
                    </>
                  )}
                </span>
              </div>
              {showFilters && (
                <FilterRow label="Priority">
                  <Chip active={priority === "all"} onClick={() => setPriority("all")}>
                    All
                  </Chip>
                  {(["critical", "high", "medium", "low"] as Priority[]).map((p) => (
                    <Chip key={p} active={priority === p} critical={p === "critical"} onClick={() => setPriority(p)}>
                      {p}
                    </Chip>
                  ))}
                </FilterRow>
              )}
            </div>
          )}

          {/* REVIEW */}
          {view === "review" && (
            <section>
              {data.sectionErrors.voiceInbox ? (
                <ErrorLine message={data.sectionErrors.voiceInbox} />
              ) : pending.length === 0 ? (
                <Card>
                  <EmptyLine>
                    {data.counts.pendingReview === 0
                      ? "Nothing to review. You're clear."
                      : "Nothing matches these filters."}
                  </EmptyLine>
                </Card>
              ) : (
                <Card title={project === "all" ? "All notes" : project || "Not placed"} detail={`${pending.length} ${pending.length === 1 ? "note" : "notes"}`}>
                  <ul className="px-5">
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
                </Card>
              )}
            </section>
          )}

          {/* FILED */}
          {view === "filed" &&
            (data.filedItems.length === 0 ? (
              <Card>
                <EmptyLine>Nothing filed yet. File a note and it lands here.</EmptyLine>
              </Card>
            ) : (
              filedByProject.map(([bucket, items]) => (
                <Card key={bucket} title={bucket || "Not placed"} detail={`${items.length} filed`}>
                  <ul className="px-5">
                    {items.map((item) => (
                      <FiledRow key={item.id} item={item} />
                    ))}
                  </ul>
                </Card>
              ))
            ))}

          {/* KNOWLEDGE */}
          {view === "knowledge" && (
            <Card>
              {data.knowledgePacketItems.length === 0 ? (
                <EmptyLine>No knowledge kept yet.</EmptyLine>
              ) : (
                <ul className="px-5">
                  {data.knowledgePacketItems.map((item) => (
                    <KnowledgeRow key={item.id} item={item} />
                  ))}
                </ul>
              )}
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}

function countByProject(items: VoiceInboxItem[]): [string, number][] {
  const map = new Map<string, number>();
  for (const i of items) map.set(i.projectBucket, (map.get(i.projectBucket) ?? 0) + 1);
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

function Logo() {
  const dim = [1, 5, 6];
  return (
    <span aria-hidden className="grid grid-cols-[repeat(3,6px)] gap-[2px]">
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="size-[6px]" style={{ background: dim.includes(i) ? "#c9ccd3" : "var(--ink)" }} />
      ))}
    </span>
  );
}

function MenuIcon() {
  return (
    <span aria-hidden className="grid grid-cols-[repeat(3,4px)] gap-[2px] opacity-75">
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="size-[4px] bg-[var(--ink)]" style={{ opacity: i % 2 ? 0.35 : 1 }} />
      ))}
    </span>
  );
}

function MenuGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="mono px-3 pb-2.5 text-[var(--ink-faint)]">{label}</div>
      {children}
    </div>
  );
}

function MenuItem({
  active,
  onClick,
  badge,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  badge?: number;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[0.9rem] ${
        active ? "bg-[var(--paper-raised)] shadow-[0_0_0_1px_var(--line)]" : "hover:bg-[#eceef1]"
      }`}
    >
      <MenuIcon />
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {badge != null && badge > 0 && (
        <span className="rounded-[5px] bg-[var(--accent)] px-1.5 text-[0.7rem] text-white">{badge}</span>
      )}
      {count != null && <span className="text-[0.78rem] text-[var(--ink-faint)]">{count}</span>}
    </button>
  );
}

function Pill({ children, critical }: { children: React.ReactNode; critical?: boolean }) {
  return (
    <span
      className={`rounded-full border border-[var(--line)] bg-[var(--paper-raised)] px-2.5 py-0.5 text-[0.78rem] ${
        critical ? "text-[var(--critical)]" : "text-[var(--ink-soft)]"
      }`}
    >
      {children}
    </span>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mx-0.5 rounded border border-[var(--line)] bg-[var(--paper-raised)] px-1.5 font-[family-name:var(--font-mono)] text-[0.66rem]">
      {children}
    </kbd>
  );
}

function Card({ title, detail, children }: { title?: string; detail?: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 rounded-[10px] border border-[var(--line)] bg-[var(--paper-raised)]">
      {title && (
        <div className="flex items-baseline gap-3 border-b border-[var(--line-soft)] px-5 py-4">
          <h2 className="text-[1rem] font-semibold">{title}</h2>
          {detail && <span className="text-[0.84rem] text-[var(--ink-faint)]">{detail}</span>}
        </div>
      )}
      {children}
    </section>
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

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-[0.76rem] font-medium text-[var(--ink-faint)]">
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
    ? "border border-[var(--critical)] bg-[var(--critical)] text-white"
    : "border border-[var(--ink)] bg-[var(--ink)] text-white";
  const idleStyle = critical
    ? "border border-[var(--line)] bg-[var(--paper-raised)] text-[var(--critical)] hover:border-[var(--critical)]"
    : "border border-[var(--line)] bg-[var(--paper-raised)] text-[var(--ink-soft)] hover:border-[var(--ink-faint)]";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-[0.84rem] transition-colors ${
        active ? activeStyle : idleStyle
      }`}
    >
      {children}
    </button>
  );
}

function KnowledgeRow({ item }: { item: KnowledgePacketItem }) {
  return (
    <li className="border-t border-[var(--line-soft)] py-4 first:border-t-0">
      <h3 className="text-[0.95rem] font-medium leading-snug text-[var(--ink)]">{item.title}</h3>
      <p className="mt-1 line-clamp-2 text-[0.82rem] leading-relaxed text-[var(--ink-soft)]">
        {item.summary}
      </p>
    </li>
  );
}

function ErrorLine({ message }: { message: string }) {
  return (
    <p className="mt-3 rounded-[10px] border border-[#f2d3cd] bg-[#fdf3f1] px-4 py-3 text-[0.85rem] text-[var(--critical)]">
      {message}
    </p>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-6 text-[0.9rem] text-[var(--ink-faint)]">{children}</p>;
}
