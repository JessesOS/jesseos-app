export function Header({ dataStatus }: { dataStatus?: string }) {
  return (
    <header className="border-b border-slate-200/70 bg-white/50 px-4 py-5 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[12px] font-medium uppercase leading-4 tracking-[0.14em] text-slate-400">
            Dashboard v0.1
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-normal text-slate-950 sm:text-4xl">
            Capture, review, remember.
          </h1>
        </div>
        <div className="max-w-xl text-[14px] leading-6 text-slate-500 md:text-right">
          Read-only operating view for voice captures, review decisions, and
          approved knowledge packets.
        </div>
      </div>
      {dataStatus ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] leading-5 text-amber-800">
          {dataStatus}
        </p>
      ) : null}
    </header>
  );
}
