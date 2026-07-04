import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { EmptyState } from "@/components/dashboard/empty-state";
import { KnowledgeIcon } from "@/components/dashboard/icons";
import type { KnowledgePacketItem } from "./types";

type KnowledgePacketsPanelProps = {
  items: KnowledgePacketItem[];
  error?: string;
};

export function KnowledgePacketsPanel({
  items,
  error,
}: KnowledgePacketsPanelProps) {
  return (
    <DashboardPanel
      id="knowledge-packets"
      title="Knowledge Packets"
      description="Latest approved knowledge ready for permanent reuse."
      aside={<KnowledgeIcon className="mt-1 size-5 text-slate-400" />}
      error={error}
    >
      {items.length === 0 ? (
        <EmptyState message="No approved knowledge packets found." />
      ) : null}
      <div className="grid gap-0 divide-y divide-slate-200/80 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        {items.map((item) => (
          <article
            key={item.id}
            className="p-5 transition-colors hover:bg-slate-50/80"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-[12px] font-medium leading-4 text-slate-500">
                {item.projectBucket}
              </p>
              <p className="text-[12px] leading-4 text-slate-400">
                {item.createdAt}
              </p>
            </div>
            <h3 className="mt-4 text-[15px] font-semibold leading-6 text-slate-950">
              {item.title}
            </h3>
            <p className="mt-3 text-[13px] leading-5 text-slate-500">
              {item.summary}
            </p>
          </article>
        ))}
      </div>
    </DashboardPanel>
  );
}
