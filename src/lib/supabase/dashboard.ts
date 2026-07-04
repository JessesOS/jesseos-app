import { getKnowledgePacketItems } from "@/features/knowledge-packets/data";
import { getReviewQueueItems } from "@/features/review-queue/data";
import { getVoiceInboxItems } from "@/features/voice-inbox/data";
import {
  createDashboardStats,
  createEmptyDashboardData,
  type DashboardData,
} from "@/lib/dashboard-data";
import { createSupabaseReadClient } from "./client";

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = createSupabaseReadClient();

  if (!supabase) {
    return createEmptyDashboardData(
      "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to read live Supabase data.",
    );
  }

  const [voiceInbox, reviewQueue, knowledgePackets] = await Promise.all([
    getVoiceInboxItems(supabase),
    getReviewQueueItems(supabase),
    getKnowledgePacketItems(supabase),
  ]);

  const data = {
    voiceInboxItems: voiceInbox.items,
    reviewQueueItems: reviewQueue.items,
    knowledgePacketItems: knowledgePackets.items,
  };

  return {
    ...data,
    dashboardStats: createDashboardStats(data),
    sectionErrors: {
      voiceInbox: voiceInbox.error,
      reviewQueue: reviewQueue.error,
      knowledgePackets: knowledgePackets.error,
    },
  };
}
