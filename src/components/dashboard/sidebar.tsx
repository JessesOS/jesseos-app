import {
  HomeIcon,
  InboxIcon,
  KnowledgeIcon,
  ReviewIcon,
} from "./icons";

const navigation = [
  { label: "Home", href: "#home", icon: HomeIcon, active: true },
  { label: "Voice Inbox", href: "#voice-inbox", icon: InboxIcon },
  { label: "Review Queue", href: "#review-queue", icon: ReviewIcon },
  {
    label: "Knowledge Packets",
    href: "#knowledge-packets",
    icon: KnowledgeIcon,
  },
];

export function Sidebar() {
  return (
    <aside className="border-b border-slate-200/80 bg-white/74 px-4 py-4 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
      <div className="flex items-center justify-between lg:block">
        <a href="#home" className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-slate-950 text-[13px] font-semibold text-white shadow-sm">
            JO
          </span>
          <span>
            <span className="block text-[15px] font-semibold leading-5 tracking-[-0.01em] text-slate-950">
              JesseOS
            </span>
            <span className="block text-[12px] leading-4 text-slate-500">
              AI operating system
            </span>
          </span>
        </a>
        <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-500 lg:mt-6 lg:inline-flex">
          v0.1
        </span>
      </div>

      <nav
        aria-label="Primary navigation"
        className="mt-4 flex gap-1 overflow-x-auto pb-1 lg:mt-8 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0"
      >
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <a
              key={item.label}
              href={item.href}
              className={`flex h-10 shrink-0 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors ${
                item.active
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <Icon className="size-[18px]" />
              {item.label}
            </a>
          );
        })}
      </nav>

      <div className="mt-8 hidden rounded-lg border border-slate-200 bg-slate-50/80 p-4 lg:block">
        <p className="text-[12px] font-medium uppercase leading-4 tracking-[0.12em] text-slate-400">
          Principle
        </p>
        <p className="mt-3 text-[13px] leading-5 text-slate-600">
          Everything is captured. Everything is reviewed. Only approved
          information becomes permanent knowledge.
        </p>
      </div>
    </aside>
  );
}
