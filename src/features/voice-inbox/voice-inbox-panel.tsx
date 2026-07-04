import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { EmptyState } from "@/components/dashboard/empty-state";
import { InboxIcon } from "@/components/dashboard/icons";
import { StatusBadge } from "@/components/dashboard/status-badge";
import type { VoiceInboxItem } from "./types";

type VoiceInboxPanelProps = {
  items: VoiceInboxItem[];
  error?: string;
};

export function VoiceInboxPanel({ items, error }: VoiceInboxPanelProps) {
  return (
    <DashboardPanel
      id="voice-inbox"
      title="Voice Inbox"
      description="Latest captured entries awaiting downstream review."
      aside={<InboxIcon className="mt-1 size-5 text-slate-400" />}
      error={error}
    >
      <div className="divide-y divide-slate-200/80">
        {items.length === 0 ? (
          <EmptyState message="No voice inbox entries found." />
        ) : null}
        {items.map((item) => (
          <article
            key={item.id}
            className="grid min-w-0 gap-3 px-5 py-4 transition-colors hover:bg-slate-50/80 sm:grid-cols-[1fr_auto]"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h3 className="text-[14px] font-semibold leading-5 text-slate-950">
                  {item.title}
                </h3>
                <span className="text-[12px] leading-4 text-slate-400">
                  {item.createdAt}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-[13px] leading-5 text-slate-500">
                {item.summary}
              </p>
            </div>
            <StatusBadge type="priority" value={item.priority} />
          </article>
        ))}
      </div>
    </DashboardPanel>
  );
}
