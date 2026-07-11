import { getKnowledgePacketItems } from "@/features/knowledge-packets/data";
import { getReviewQueueItems } from "@/features/review-queue/data";
import { getVoiceInboxItems } from "@/features/voice-inbox/data";
import {
  createDashboardStats,
  createEmptyDashboardData,
  type DashboardCounts,
  type DashboardData,
} from "@/lib/dashboard-data";
import { createSupabaseReadClient } from "./client";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = createSupabaseReadClient();

  if (!supabase) {
    return createEmptyDashboardData(
      "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to read live Supabase data.",
    );
  }

  const [voiceInbox, reviewQueue, knowledgePackets, counts] = await Promise.all([
    getVoiceInboxItems(supabase),
    getReviewQueueItems(supabase),
    getKnowledgePacketItems(supabase),
    getCounts(supabase),
  ]);

  const data = {
    voiceInboxItems: voiceInbox.items,
    reviewQueueItems: reviewQueue.items,
    knowledgePacketItems: knowledgePackets.items,
  };

  return {
    ...data,
    dashboardStats: createDashboardStats(counts),
    sectionErrors: {
      voiceInbox: voiceInbox.error,
      reviewQueue: reviewQueue.error,
      knowledgePackets: knowledgePackets.error,
    },
  };
}

/**
 * True totals — counted server-side, not derived from the (capped) item lists,
 * so "35 pending" reads as 35 rather than the fetch limit.
 */
async function getCounts(supabase: SupabaseClient): Promise<DashboardCounts> {
  const [capturedRes, pendingRes, knowledgeRes] = await Promise.all([
    supabase.from("voice_inbox").select("*", { count: "exact", head: true }),
    supabase
      .from("voice_inbox")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_review"),
    supabase.from("knowledge_packets").select("*", { count: "exact", head: true }),
  ]);

  return {
    captured: capturedRes.count ?? 0,
    pendingReview: pendingRes.count ?? 0,
    knowledge: knowledgeRes.count ?? 0,
  };
}
