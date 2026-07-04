import type { DashboardStat } from "@/lib/dashboard-data";

export function StatusStrip({ stats }: { stats: DashboardStat[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border border-slate-200/80 bg-white/78 px-4 py-4 shadow-[0_1px_1px_rgba(15,23,42,0.03)] backdrop-blur"
        >
          <p className="text-[12px] font-medium leading-4 text-slate-500">
            {stat.label}
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
            <p className="text-3xl font-semibold leading-none tracking-normal text-slate-950">
              {stat.value}
            </p>
            <p className="text-[12px] leading-4 text-slate-400 sm:pb-1">
              {stat.detail}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
