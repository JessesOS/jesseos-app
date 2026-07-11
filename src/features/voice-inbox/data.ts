import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDisplayDate } from "@/features/shared/format";
import type { SectionResult } from "@/features/shared/section-result";
import type { Priority, VoiceInboxItem, VoiceInboxRow } from "./types";

const VOICE_INBOX_COLUMNS =
  "id,created_at,title,summary,raw_text,transcript,priority,project_bucket";

/** Everything still awaiting a decision — all of it, so nothing hides. */
export async function getVoiceInboxItems(
  supabase: SupabaseClient,
): Promise<SectionResult<VoiceInboxItem>> {
  const { data, error } = await supabase
    .from("voice_inbox")
    .select(VOICE_INBOX_COLUMNS)
    .eq("status", "pending_review")
    .order("created_at", { ascending: false });

  if (error) return { items: [], error: error.message };
  return { items: ((data ?? []) as VoiceInboxRow[]).map(mapVoiceInboxRow) };
}

/** Items already filed — the "areas" captures land in, grouped by project later. */
export async function getFiledItems(
  supabase: SupabaseClient,
): Promise<SectionResult<VoiceInboxItem>> {
  const { data, error } = await supabase
    .from("voice_inbox")
    .select(VOICE_INBOX_COLUMNS)
    .eq("status", "filed")
    .order("reviewed_at", { ascending: false })
    .limit(200);

  if (error) return { items: [], error: error.message };
  return { items: ((data ?? []) as VoiceInboxRow[]).map(mapVoiceInboxRow) };
}

function mapVoiceInboxRow(row: VoiceInboxRow): VoiceInboxItem {
  return {
    id: row.id,
    title: row.title ?? "Untitled capture",
    summary: row.summary ?? "No summary yet.",
    fullText: row.transcript?.trim() || row.raw_text?.trim() || "",
    priority: normalizePriority(row.priority),
    projectBucket: row.project_bucket ?? "unsorted",
    createdAt: formatDisplayDate(row.created_at),
  };
}

function normalizePriority(value: string | null): Priority {
  if (value === "high" || value === "medium" || value === "low") return value;
  return "medium";
}
