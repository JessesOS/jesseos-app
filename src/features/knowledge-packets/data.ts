import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDisplayDate } from "@/features/shared/format";
import type { SectionResult } from "@/features/shared/section-result";
import type { KnowledgePacketItem, KnowledgePacketRow } from "./types";

const KNOWLEDGE_PACKET_COLUMNS = "id,created_at,title,summary,project_bucket";
const MAX_KNOWLEDGE_PACKET_ITEMS = 5;

export async function getKnowledgePacketItems(
  supabase: SupabaseClient,
): Promise<SectionResult<KnowledgePacketItem>> {
  const { data, error } = await supabase
    .from("knowledge_packets")
    .select(KNOWLEDGE_PACKET_COLUMNS)
    .limit(MAX_KNOWLEDGE_PACKET_ITEMS);

  if (error) {
    return { items: [], error: error.message };
  }

  return {
    items: ((data ?? []) as KnowledgePacketRow[]).map(mapKnowledgePacketRow),
  };
}

function mapKnowledgePacketRow(row: KnowledgePacketRow): KnowledgePacketItem {
  return {
    id: row.id,
    title: row.title ?? "Untitled knowledge",
    summary: row.summary ?? "No summary available yet.",
    createdAt: formatDisplayDate(row.created_at),
    projectBucket: row.project_bucket ?? "Knowledge",
  };
}
