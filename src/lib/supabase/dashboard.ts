import { getKnowledgePacketItems } from "@/features/knowledge-packets/data";
import { getFiledItems, getVoiceInboxItems } from "@/features/voice-inbox/data";
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

  const [voiceInbox, filed, knowledgePackets, counts] = await Promise.all([
    getVoiceInboxItems(supabase),
    getFiledItems(supabase),
    getKnowledgePacketItems(supabase),
    getCounts(supabase),
  ]);

  return {
    voiceInboxItems: voiceInbox.items,
    filedItems: filed.items,
    reviewQueueItems: [],
    knowledgePacketItems: knowledgePackets.items,
    counts,
    dashboardStats: createDashboardStats(counts),
    sectionErrors: {
      voiceInbox: voiceInbox.error,
      reviewQueue: filed.error,
      knowledgePackets: knowledgePackets.error,
    },
  };
}

/**
 * True totals — counted server-side, not derived from the item lists, so a
 * "35 to review" reads as 35.
 */
async function getCounts(supabase: SupabaseClient): Promise<DashboardCounts> {
  const countBy = (status?: string) => {
    let q = supabase.from("voice_inbox").select("*", { count: "exact", head: true });
    if (status) q = q.eq("status", status);
    return q;
  };

  const [capturedRes, pendingRes, filedRes, knowledgeRes] = await Promise.all([
    countBy(),
    countBy("pending_review"),
    countBy("filed"),
    supabase.from("knowledge_packets").select("*", { count: "exact", head: true }),
  ]);

  return {
    captured: capturedRes.count ?? 0,
    pendingReview: pendingRes.count ?? 0,
    filed: filedRes.count ?? 0,
    knowledge: knowledgeRes.count ?? 0,
  };
}
