import type { KnowledgePacketItem } from "@/features/knowledge-packets/types";
import type { ReviewQueueItem } from "@/features/review-queue/types";
import type { VoiceInboxItem } from "@/features/voice-inbox/types";

export type DashboardStat = {
  label: string;
  value: number;
  detail: string;
};

export type DashboardSectionErrors = {
  voiceInbox?: string;
  reviewQueue?: string;
  knowledgePackets?: string;
};

export type DashboardData = {
  voiceInboxItems: VoiceInboxItem[];
  reviewQueueItems: ReviewQueueItem[];
  knowledgePacketItems: KnowledgePacketItem[];
  dashboardStats: DashboardStat[];
  sectionErrors: DashboardSectionErrors;
  dataStatus?: string;
};

export function createDashboardStats(data: {
  voiceInboxItems: VoiceInboxItem[];
  reviewQueueItems: ReviewQueueItem[];
  knowledgePacketItems: KnowledgePacketItem[];
}): DashboardStat[] {
  return [
    {
      label: "Captured signals",
      value: data.voiceInboxItems.length,
      detail: "latest voice entries",
    },
    {
      label: "Pending review",
      value: data.reviewQueueItems.filter(
        (item) => item.reviewStatus !== "ready",
      ).length,
      detail: "awaiting decision",
    },
    {
      label: "Approved knowledge",
      value: data.knowledgePacketItems.length,
      detail: "ready for reuse",
    },
  ];
}

export function createEmptyDashboardData(dataStatus?: string): DashboardData {
  const data = {
    voiceInboxItems: [],
    reviewQueueItems: [],
    knowledgePacketItems: [],
  };

  return {
    ...data,
    dashboardStats: createDashboardStats(data),
    sectionErrors: {},
    dataStatus,
  };
}
