import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ReviewIcon } from "@/components/dashboard/icons";
import { StatusBadge } from "@/components/dashboard/status-badge";
import type { ReviewQueueItem } from "./types";

type ReviewQueuePanelProps = {
  items: ReviewQueueItem[];
  error?: string;
};

export function ReviewQueuePanel({ items, error }: ReviewQueuePanelProps) {
  return (
    <DashboardPanel
      id="review-queue"
      title="Review Queue"
      description="Pending items classified before they become knowledge."
      aside={<ReviewIcon className="mt-1 size-5 text-slate-400" />}
      error={error}
    >
      {items.length === 0 ? (
        <EmptyState message="No review queue items found." />
      ) : null}
      {items.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200/80 text-[11px] uppercase leading-4 tracking-[0.1em] text-slate-400">
                <th className="px-5 py-3 font-medium">Pending item</th>
                <th className="px-4 py-3 font-medium">Classification</th>
                <th className="px-5 py-3 font-medium">Review status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4">
                    <p className="text-[13px] font-semibold leading-5 text-slate-950">
                      {item.title}
                    </p>
                    <p className="mt-1 text-[12px] leading-4 text-slate-400">
                      Source: {item.sourceTable}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-[13px] leading-5 text-slate-600">
                    {item.classification}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge type="review" value={item.reviewStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </DashboardPanel>
  );
}
