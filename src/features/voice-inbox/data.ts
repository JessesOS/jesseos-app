import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDisplayDate } from "@/features/shared/format";
import type { SectionResult } from "@/features/shared/section-result";
import type { Priority, VoiceInboxItem, VoiceInboxRow } from "./types";

const VOICE_INBOX_COLUMNS = "id,created_at,title,summary,priority";
const MAX_VOICE_INBOX_ITEMS = 5;

export async function getVoiceInboxItems(
  supabase: SupabaseClient,
): Promise<SectionResult<VoiceInboxItem>> {
  const { data, error } = await supabase
    .from("voice_inbox")
    .select(VOICE_INBOX_COLUMNS)
    .limit(MAX_VOICE_INBOX_ITEMS);

  if (error) {
    return { items: [], error: error.message };
  }

  return {
    items: ((data ?? []) as VoiceInboxRow[]).map(mapVoiceInboxRow),
  };
}

function mapVoiceInboxRow(row: VoiceInboxRow): VoiceInboxItem {
  return {
    id: row.id,
    title: row.title ?? "Untitled capture",
    summary: row.summary ?? "No summary available yet.",
    priority: normalizePriority(row.priority),
    createdAt: formatDisplayDate(row.created_at),
  };
}

function normalizePriority(value: string | null): Priority {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }

  return "low";
}
