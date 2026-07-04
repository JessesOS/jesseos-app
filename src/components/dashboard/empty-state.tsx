export function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-5 py-8 text-[13px] leading-5 text-slate-500">
      {message}
    </div>
  );
}
