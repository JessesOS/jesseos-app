"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DashboardData } from "@/lib/dashboard-data";
import type { VoiceInboxItem, Priority } from "@/features/voice-inbox/types";
import { CaptureCard, type CaptureCardHandle } from "@/features/voice-inbox/capture-card";
import { DoneRow, doneLabel } from "@/features/voice-inbox/done-row";
import { BinnedList } from "@/features/voice-inbox/binned-list";

type View = "needs" | "done" | "binned";

/** Personal notes: shown in Done only as a count, never their content. */
const LIFE_PROJECTS = new Set(["personalos"]);

export const PRIORITY_RANK: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function DashboardClient({ data }: { data: DashboardData }) {
  const [view, setView] = useState<View>("needs");
  const [query, setQuery] = useState("");
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const projectNames = useMemo(() => data.projects.map((p) => p.name), [data.projects]);

  // Needs you: everything still awaiting a decision.
  const needs = useMemo(
    () =>
      [...data.voiceInboxItems].sort(
        (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
      ),
    [data.voiceInboxItems],
  );

  const isBinned = (i: VoiceInboxItem) => i.status !== "filed";
  const workItems = useMemo(
    () => data.doneItems.filter((i) => !LIFE_PROJECTS.has(i.projectBucket)),
    [data.doneItems],
  );
  const doneWork = useMemo(() => workItems.filter((i) => !isBinned(i)), [workItems]);
  const binnedWork = useMemo(() => workItems.filter(isBinned), [workItems]);
  const lifeDone = data.doneItems.filter((i) => LIFE_PROJECTS.has(i.projectBucket) && !isBinned(i)).length;
  const lifeBinned = data.doneItems.filter((i) => LIFE_PROJECTS.has(i.projectBucket) && isBinned(i)).length;

  // Search covers Needs you and Done (not Life content).
  const q = query.trim().toLowerCase();
  const hits = useMemo(() => {
    if (!q) return [];
    const match = (i: VoiceInboxItem) =>
      `${i.title} ${i.summary} ${i.projectBucket} ${i.people.join(" ")} ${i.tags.join(" ")}`
        .toLowerCase()
        .includes(q);
    return [
      ...needs.filter(match).map((item) => ({ item, where: "Needs you" })),
      ...doneWork.filter(match).map((item) => ({ item, where: "Done" })),
      ...binnedWork.filter(match).map((item) => ({ item, where: "Binned" })),
    ];
  }, [q, needs, doneWork, binnedWork]);

  // --- keyboard triage (desktop): j/k move, f yes, x bin, u undo ---
  const handlesRef = useRef(new Map<string, CaptureCardHandle>());
  const registerHandle = useCallback((id: string, handle: CaptureCardHandle | null) => {
    if (handle) handlesRef.current.set(id, handle);
    else handlesRef.current.delete(id);
  }, []);

  const pendingIdsRef = useRef<string[]>([]);
  const focusedIdRef = useRef<string | null>(null);
  useEffect(() => {
    pendingIdsRef.current = needs.map((i) => i.id);
    focusedIdRef.current = focusedId;
  });

  useEffect(() => {
    if (view !== "needs") return;

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
        case "f":
        case "x":
        case "u": {
          const current = focusedIdRef.current;
          const handle = current ? handlesRef.current.get(current) : undefined;
          if (!handle) break;
          e.preventDefault();
          if (e.key === "f") handle.primary();
          else if (e.key === "x") handle.dismiss();
          else handle.undo();
          break;
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [view]);

  const needsCount = data.counts.pendingReview;
  const title = q ? "Search" : view === "needs" ? "Needs you" : view === "done" ? "Done" : "Binned";
  const line = q
    ? "Every note, waiting or done. Personal notes aren't searched here."
    : view === "needs"
      ? "The notes waiting on you. Yes does what the AI suggests, Change moves it, Bin drops it."
      : view === "done"
        ? "Notes you filed, and where each one went. Undo brings a note back."
        : "Notes you binned. Preview one, then Undo to bring it back or Delete forever.";

  const go = (v: View) => {
    setView(v);
    setQuery("");
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      {/* top bar: name, search */}
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-[var(--line)] bg-[var(--paper-raised)] px-4 sm:gap-5 sm:px-7">
        <span className="flex shrink-0 items-center gap-2.5 text-[1.2rem] font-bold tracking-[-0.02em]">
          <Logo />
          <span className="hidden sm:inline">JesseOS</span>
        </span>
        <label className="flex min-w-0 max-w-[560px] flex-1 items-center gap-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2">
          <span aria-hidden className="text-[var(--ink-faint)]">⌕</span>
          <span className="sr-only">Search</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search every note"
            className="min-w-0 flex-1 bg-transparent text-[0.9rem] outline-none placeholder:text-[var(--ink-faint)]"
          />
        </label>
        <span className="ml-auto grid size-[30px] shrink-0 place-items-center rounded-full border border-[var(--line)] bg-[var(--paper)] text-[0.8rem] font-semibold">
          J
        </span>
      </header>

      <div className="md:grid md:grid-cols-[240px_1fr]">
        {/* left menu */}
        <nav className="hidden border-r border-[var(--line)] px-4 py-7 md:block">
          <div className="mono px-3 pb-2.5 text-[var(--ink-faint)]">Voice inbox</div>
          <MenuItem active={!q && view === "needs"} onClick={() => go("needs")} badge={needsCount}>
            Needs you
          </MenuItem>
          <MenuItem active={!q && view === "done"} onClick={() => go("done")}>
            Done
          </MenuItem>
          <MenuItem active={!q && view === "binned"} onClick={() => go("binned")}>
            Binned
          </MenuItem>
          <p className="px-3 pt-5 text-[0.78rem] leading-relaxed text-[var(--ink-faint)]">
            Needs you: notes waiting for your decision.
            <br />
            <br />
            Done: notes you filed, with where each one went.
            <br />
            <br />
            Binned: notes you dropped. Delete them for good from here.
          </p>
        </nav>

        <main className="mx-auto w-full max-w-[1040px] px-4 pb-20 pt-6 sm:px-10">
          <div className="flex gap-2 border-b border-[var(--line)] pb-3.5 text-[0.84rem] text-[var(--ink-faint)]">
            Voice inbox <span>/</span> <b className="font-medium text-[var(--ink)]">{title}</b>
          </div>

          <div className="mb-6 mt-4 flex flex-col gap-1 rounded-[10px] bg-[var(--banner)] px-6 py-4 sm:flex-row sm:items-center sm:gap-5">
            <span className="mono shrink-0 text-[var(--ink-soft)]">Voice inbox</span>
            <div>
              <h3 className="text-[1.1rem] font-medium tracking-[-0.01em]">
                Talk into your phone. It lands here.
              </h3>
              <p className="mt-0.5 text-[0.875rem] text-[var(--ink-soft)]">{line}</p>
            </div>
          </div>

          <h1 className="mb-5 flex items-baseline gap-3.5 text-[1.875rem] font-medium tracking-[-0.02em]">
            {title}
            {!q && view === "needs" && (
              <span className="tabular-nums text-[var(--accent)]">{needsCount}</span>
            )}
          </h1>

          {/* phone: switch between the two views */}
          {!q && (
            <div className="mb-4 flex gap-2 md:hidden">
              <Tab active={view === "needs"} onClick={() => go("needs")}>
                Needs you {needsCount}
              </Tab>
              <Tab active={view === "done"} onClick={() => go("done")}>
                Done
              </Tab>
              <Tab active={view === "binned"} onClick={() => go("binned")}>
                Binned
              </Tab>
            </div>
          )}

          {data.dataStatus && (
            <p className="mb-5 rounded-[10px] border border-[var(--line)] bg-[var(--paper-raised)] px-4 py-3 text-[0.85rem] text-[var(--ink-soft)]">
              {data.dataStatus}
            </p>
          )}

          {/* SEARCH */}
          {q && (
            <Card title="Results" detail={`${hits.length} found`}>
              {hits.length === 0 ? (
                <EmptyLine>Nothing matches &ldquo;{query.trim()}&rdquo;.</EmptyLine>
              ) : (
                <ul className="px-5">
                  {hits.map(({ item, where }) => (
                    <li key={item.id} className="border-t border-[var(--line-soft)] py-3.5 first:border-t-0">
                      <h3 className="text-[0.95rem] font-medium leading-snug">{item.title}</h3>
                      <p className="mt-1 line-clamp-2 max-w-[68ch] text-[0.85rem] text-[var(--ink-soft)]">
                        {item.summary}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[0.76rem] text-[var(--ink-faint)]">
                        <span className="rounded-md border border-[var(--line)] px-2 py-0.5 text-[var(--ink-soft)]">
                          {where}
                        </span>
                        {where !== "Needs you" && <span>{doneLabel(item)}</span>}
                        <span>{item.createdAt}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {/* NEEDS YOU */}
          {!q && view === "needs" && (
            <section>
              {data.sectionErrors.voiceInbox ? (
                <ErrorLine message={data.sectionErrors.voiceInbox} />
              ) : (
                <Card
                  title="Waiting on you"
                  detail={`${needs.length} ${needs.length === 1 ? "note" : "notes"}`}
                >
                  {needs.length === 0 ? (
                    <EmptyLine>Nothing needs you. Talk into your phone and new notes land here.</EmptyLine>
                  ) : (
                    <ul className="px-5">
                      {needs.map((item) => (
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
                </Card>
              )}
            </section>
          )}

          {/* DONE */}
          {!q && view === "done" && (
            <>
              <Card title="Settled" detail={`${doneWork.length} notes, newest first`}>
                {doneWork.length === 0 ? (
                  <EmptyLine>Nothing settled yet.</EmptyLine>
                ) : (
                  <ul className="px-5">
                    {doneWork.map((item) => (
                      <DoneRow key={item.id} item={item} />
                    ))}
                  </ul>
                )}
              </Card>
              <LifeCard count={lifeDone} />
            </>
          )}

          {/* BINNED */}
          {!q && view === "binned" && (
            <>
              <Card title="In the bin" detail={`${binnedWork.length} notes, newest first`}>
                <BinnedList items={binnedWork} onGoNeeds={() => go("needs")} />
              </Card>
              <LifeCard count={lifeBinned} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function LifeCard({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <Card>
      <div className="flex items-center gap-3.5 px-5 py-4">
        <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-[var(--paper)] text-[0.9rem]">
          🔒
        </span>
        <div>
          <p className="text-[0.95rem] font-medium">
            {count} personal {count === 1 ? "note" : "notes"}
          </p>
          <p className="text-[0.8rem] text-[var(--ink-faint)]">Private. Only the count shows here.</p>
        </div>
      </div>
    </Card>
  );
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

function MenuItem({
  active,
  onClick,
  badge,
  children,
}: {
  active: boolean;
  onClick: () => void;
  badge?: number;
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
    </button>
  );
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
      className={`rounded-lg border px-3 py-1.5 text-[0.84rem] ${
        active
          ? "border-[var(--ink)] bg-[var(--ink)] text-white"
          : "border-[var(--line)] bg-[var(--paper-raised)] text-[var(--ink-soft)]"
      }`}
    >
      {children}
    </button>
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
