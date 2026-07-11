import type { ReviewQueueItem } from "@/features/review-queue/types";
import type { KnowledgePacketItem } from "@/features/knowledge-packets/types";
import type { DashboardData } from "@/lib/dashboard-data";
import { CaptureCard } from "@/features/voice-inbox/capture-card";

type DashboardLayoutProps = {
  data: DashboardData;
};

export function DashboardLayout({ data }: DashboardLayoutProps) {
  const toReview = data.dashboardStats.find((s) => s.label === "To review")?.value ?? 0;

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="mx-auto w-full max-w-[46rem] px-6 py-14 sm:py-20">
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
            {toReview > 0 ? (
              <>
                {toReview} {toReview === 1 ? "thing is" : "things are"}
                <br />
                waiting for you.
              </>
            ) : (
              <>You&rsquo;re all caught up.</>
            )}
          </h1>
          <p className="mt-5 max-w-md text-[1.02rem] leading-relaxed text-[var(--ink-soft)]">
            Everything you capture lands here first — deciphered and sorted, ready for
            a quick yes or no before it becomes part of your system.
          </p>
        </header>

        {/* quiet stats */}
        <dl className="mt-11 flex flex-wrap gap-x-12 gap-y-4 border-y border-[var(--line)] py-6">
          {data.dashboardStats.map((stat) => (
            <div key={stat.label}>
              <dt className="text-[0.75rem] font-medium uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                {stat.label}
              </dt>
              <dd className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums tracking-tight text-[var(--ink)]">
                  {stat.value}
                </span>
                <span className="text-[0.8rem] text-[var(--ink-soft)]">{stat.detail}</span>
              </dd>
            </div>
          ))}
        </dl>

        {data.dataStatus && (
          <p className="mt-6 rounded-lg border border-[var(--line)] bg-[var(--paper-raised)] px-4 py-3 text-[0.85rem] text-[var(--ink-soft)]">
            {data.dataStatus}
          </p>
        )}

        {/* focal: captures */}
        <section className="mt-12">
          <SectionHeading>Latest captures</SectionHeading>
          {data.sectionErrors.voiceInbox ? (
            <ErrorLine message={data.sectionErrors.voiceInbox} />
          ) : data.voiceInboxItems.length === 0 ? (
            <EmptyLine>Nothing captured yet — send your first note.</EmptyLine>
          ) : (
            <ul className="mt-1">
              {data.voiceInboxItems.map((item) => (
                <CaptureCard key={item.id} item={item} />
              ))}
            </ul>
          )}
        </section>

        {/* quieter: in review + knowledge */}
        <div className="mt-14 grid gap-12 sm:grid-cols-2">
          <section>
            <SectionHeading>In review</SectionHeading>
            {data.sectionErrors.reviewQueue ? (
              <ErrorLine message={data.sectionErrors.reviewQueue} />
            ) : data.reviewQueueItems.length === 0 ? (
              <EmptyLine>Nothing in review.</EmptyLine>
            ) : (
              <ul className="mt-1">
                {data.reviewQueueItems.map((item) => (
                  <ReviewRow key={item.id} item={item} />
                ))}
              </ul>
            )}
          </section>

          <section>
            <SectionHeading>Knowledge</SectionHeading>
            {data.sectionErrors.knowledgePackets ? (
              <ErrorLine message={data.sectionErrors.knowledgePackets} />
            ) : data.knowledgePacketItems.length === 0 ? (
              <EmptyLine>No knowledge kept yet.</EmptyLine>
            ) : (
              <ul className="mt-1">
                {data.knowledgePacketItems.map((item) => (
                  <KnowledgeRow key={item.id} item={item} />
                ))}
              </ul>
            )}
          </section>
        </div>

        <footer className="mt-16 border-t border-[var(--line)] pt-6 text-[0.78rem] text-[var(--ink-faint)]">
          Capture · review · remember.
        </footer>
      </div>
    </main>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
      {children}
    </h2>
  );
}

function ReviewRow({ item }: { item: ReviewQueueItem }) {
  return (
    <li className="border-t border-[var(--line-soft)] py-3.5 first:border-t-0">
      <h3 className="text-[0.95rem] font-medium leading-snug text-[var(--ink)]">
        {item.title}
      </h3>
      <p className="mt-1 text-[0.8rem] text-[var(--ink-faint)]">{item.classification}</p>
    </li>
  );
}

function KnowledgeRow({ item }: { item: KnowledgePacketItem }) {
  return (
    <li className="border-t border-[var(--line-soft)] py-3.5 first:border-t-0">
      <h3 className="text-[0.95rem] font-medium leading-snug text-[var(--ink)]">
        {item.title}
      </h3>
      <p className="mt-1 line-clamp-2 text-[0.8rem] leading-relaxed text-[var(--ink-soft)]">
        {item.summary}
      </p>
    </li>
  );
}

function ErrorLine({ message }: { message: string }) {
  return (
    <p className="mt-1 rounded-lg border border-[#e7d3cc] bg-[#fbf1ee] px-3.5 py-2.5 text-[0.85rem] text-[var(--clay)]">
      {message}
    </p>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[0.9rem] text-[var(--ink-faint)]">{children}</p>;
}
