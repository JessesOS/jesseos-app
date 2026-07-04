import type { ReactNode } from "react";

type DashboardPanelProps = {
  id?: string;
  title: string;
  description?: string;
  aside?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
};

export function DashboardPanel({
  id,
  title,
  description,
  aside,
  error,
  children,
  className = "",
}: DashboardPanelProps) {
  return (
    <section
      id={id}
      className={`min-w-0 rounded-lg border border-slate-200/80 bg-white/88 shadow-[0_1px_1px_rgba(15,23,42,0.04),0_20px_60px_rgba(15,23,42,0.05)] backdrop-blur ${className}`}
    >
      <div className="flex items-start justify-between gap-5 border-b border-slate-200/80 px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold leading-6 text-slate-950">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-[13px] leading-5 text-slate-500">
              {description}
            </p>
          ) : null}
        </div>
        {aside}
      </div>
      {error ? (
        <p className="border-b border-amber-200/80 bg-amber-50 px-5 py-3 text-[13px] leading-5 text-amber-800">
          {error}
        </p>
      ) : null}
      {children}
    </section>
  );
}
