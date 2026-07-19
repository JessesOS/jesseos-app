import type { ReviewStatus } from "@/features/review-queue/types";
import type { Priority } from "@/features/voice-inbox/types";

const priorityStyles: Record<Priority, string> = {
  critical: "border-red-300 bg-red-50 text-red-800",
  high: "border-rose-200 bg-rose-50 text-rose-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-slate-200 bg-slate-50 text-slate-600",
};

const reviewStyles: Record<ReviewStatus, string> = {
  "needs review": "border-amber-200 bg-amber-50 text-amber-700",
  "in progress": "border-sky-200 bg-sky-50 text-sky-700",
  ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

type StatusBadgeProps =
  | {
      type: "priority";
      value: Priority;
    }
  | {
      type: "review";
      value: ReviewStatus;
    };

export function StatusBadge(props: StatusBadgeProps) {
  const className =
    props.type === "priority"
      ? priorityStyles[props.value]
      : reviewStyles[props.value];

  return (
    <span
      className={`inline-flex h-6 w-fit shrink-0 items-center rounded-md border px-2 text-[11px] font-medium capitalize leading-none ${className}`}
    >
      {props.value}
    </span>
  );
}
