"use client";

import { useMemo, useState } from "react";
import type { DashboardData } from "@/lib/dashboard-data";
import type { VoiceInboxItem, Priority } from "@/features/voice-inbox/types";
import type { KnowledgePacketItem } from "@/features/knowledge-packets/types";
import { CaptureCard } from "@/features/voice-inbox/capture-card";
import { FiledRow } from "@/features/voice-inbox/filed-row";

type View = "review" | "filed" | "knowledge";

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export function DashboardClient({ data }: { data: DashboardData }) {
  const [view, setView] = useState<View>("review");
  const [priority, setPriority] = useState<"all" | Priority>("all");
  const [project, setProject] = useState<string>("all");

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

        {/* view switcher */}
        <nav className="mt-12 flex gap-6 border-b border-[var(--line)]">
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

        {/* REVIEW */}
        {view === "review" && (
          <section className="mt-7">
            {/* filters */}
            <div className="flex flex-col gap-3 border-b border-[var(--line-soft)] pb-4">
              <FilterRow label="Priority">
                <Chip active={priority === "all"} onClick={() => setPriority("all")}>
                  All
                </Chip>
                {(["high", "medium", "low"] as Priority[]).map((p) => (
                  <Chip key={p} active={priority === p} onClick={() => setPriority(p)}>
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
            </div>

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
                  <CaptureCard key={item.id} item={item} />
                ))}
              </ul>
            )}
          </section>
        )}

        {/* FILED */}
        {view === "filed" && (
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
        {view === "knowledge" && (
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
      className={`rounded-full px-3 py-1 text-[0.78rem] font-medium capitalize transition-colors ${
        active
          ? "bg-[var(--ink)] text-[var(--paper)]"
          : "border border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--ink-soft)]"
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
