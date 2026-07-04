import { KnowledgePacketsPanel } from "@/features/knowledge-packets/knowledge-packets-panel";
import { ReviewQueuePanel } from "@/features/review-queue/review-queue-panel";
import { VoiceInboxPanel } from "@/features/voice-inbox/voice-inbox-panel";
import type { DashboardData } from "@/lib/dashboard-data";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { StatusStrip } from "./status-strip";

type DashboardLayoutProps = {
  data: DashboardData;
};

export function DashboardLayout({ data }: DashboardLayoutProps) {
  return (
    <main
      id="home"
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,#eef6ff_0,#f8fafc_34%,#f4f7fb_68%,#edf1f7_100%)] text-slate-950"
    >
      <div className="mx-auto flex min-h-screen w-full max-w-[1480px] flex-col lg:flex-row">
        <Sidebar />
        <section className="flex min-w-0 flex-1 flex-col">
          <Header dataStatus={data.dataStatus} />
          <div className="flex-1 px-4 pb-8 pt-4 sm:px-6 lg:px-8 lg:pb-10">
            <StatusStrip stats={data.dashboardStats} />
            <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
              <VoiceInboxPanel
                items={data.voiceInboxItems}
                error={data.sectionErrors.voiceInbox}
              />
              <ReviewQueuePanel
                items={data.reviewQueueItems}
                error={data.sectionErrors.reviewQueue}
              />
            </div>
            <div className="mt-5">
              <KnowledgePacketsPanel
                items={data.knowledgePacketItems}
                error={data.sectionErrors.knowledgePackets}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
