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

export type DashboardCounts = {
  captured: number;
  pendingReview: number;
  knowledge: number;
};

export type DashboardData = {
  voiceInboxItems: VoiceInboxItem[];
  reviewQueueItems: ReviewQueueItem[];
  knowledgePacketItems: KnowledgePacketItem[];
  dashboardStats: DashboardStat[];
  sectionErrors: DashboardSectionErrors;
  dataStatus?: string;
};

export function createDashboardStats(counts: DashboardCounts): DashboardStat[] {
  return [
    {
      label: "Captured",
      value: counts.captured,
      detail: "total voice + text",
    },
    {
      label: "To review",
      value: counts.pendingReview,
      detail: "waiting on you",
    },
    {
      label: "Knowledge",
      value: counts.knowledge,
      detail: "kept for reuse",
    },
  ];
}

export function createEmptyDashboardData(dataStatus?: string): DashboardData {
  return {
    voiceInboxItems: [],
    reviewQueueItems: [],
    knowledgePacketItems: [],
    dashboardStats: createDashboardStats({
      captured: 0,
      pendingReview: 0,
      knowledge: 0,
    }),
    sectionErrors: {},
    dataStatus,
  };
}
