import type { KnowledgePacketItem } from "@/features/knowledge-packets/types";
import type { Project } from "@/features/projects/types";
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
  filed: number;
  knowledge: number;
};

export type DashboardData = {
  voiceInboxItems: VoiceInboxItem[];
  filedItems: VoiceInboxItem[];
  projects: Project[];
  reviewQueueItems: ReviewQueueItem[];
  knowledgePacketItems: KnowledgePacketItem[];
  counts: DashboardCounts;
  dashboardStats: DashboardStat[];
  sectionErrors: DashboardSectionErrors;
  dataStatus?: string;
};

export function createDashboardStats(counts: DashboardCounts): DashboardStat[] {
  return [
    { label: "To review", value: counts.pendingReview, detail: "waiting on you" },
    { label: "Filed", value: counts.filed, detail: "sorted into projects" },
    { label: "Knowledge", value: counts.knowledge, detail: "kept for reuse" },
    { label: "Captured", value: counts.captured, detail: "total ever" },
  ];
}

export function createEmptyDashboardData(dataStatus?: string): DashboardData {
  const counts = { captured: 0, pendingReview: 0, filed: 0, knowledge: 0 };
  return {
    voiceInboxItems: [],
    filedItems: [],
    projects: [],
    reviewQueueItems: [],
    knowledgePacketItems: [],
    counts,
    dashboardStats: createDashboardStats(counts),
    sectionErrors: {},
    dataStatus,
  };
}
