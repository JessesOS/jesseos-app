import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDisplayDate } from "@/features/shared/format";
import type { SectionResult } from "@/features/shared/section-result";
import type {
  CaptureKind,
  Priority,
  SuggestedAction,
  VoiceInboxItem,
  VoiceInboxRow,
} from "./types";

const VOICE_INBOX_COLUMNS =
  "id,created_at,title,summary,raw_text,transcript,priority,project_bucket," +
  "next_step,action_items,tags,people,kind,disposable,suggested_action,audio_path";

// Pre-migration-003 column set — lets the dashboard keep rendering if the new
// columns don't exist yet.
const LEGACY_COLUMNS =
  "id,created_at,title,summary,raw_text,transcript,priority,project_bucket";

/** Everything still awaiting a decision — all of it, so nothing hides. */
export async function getVoiceInboxItems(
  supabase: SupabaseClient,
): Promise<SectionResult<VoiceInboxItem>> {
  return queryItems(supabase, (q) =>
    q.eq("status", "pending_review").order("created_at", { ascending: false }),
  );
}

/** Items already filed — the "areas" captures land in, grouped by project later. */
export async function getFiledItems(
  supabase: SupabaseClient,
): Promise<SectionResult<VoiceInboxItem>> {
  return queryItems(supabase, (q) =>
    q.eq("status", "filed").order("reviewed_at", { ascending: false }).limit(200),
  );
}

type QueryShaper = (
  q: ReturnType<ReturnType<SupabaseClient["from"]>["select"]>,
) => ReturnType<ReturnType<SupabaseClient["from"]>["select"]>;

async function queryItems(
  supabase: SupabaseClient,
  shape: QueryShaper,
): Promise<SectionResult<VoiceInboxItem>> {
  const full = await shape(supabase.from("voice_inbox").select(VOICE_INBOX_COLUMNS));
  if (!full.error) {
    return { items: ((full.data ?? []) as unknown as VoiceInboxRow[]).map(mapVoiceInboxRow) };
  }

  // Missing-column error (migration 003 not run yet) — retry with legacy columns.
  const legacy = await shape(supabase.from("voice_inbox").select(LEGACY_COLUMNS));
  if (legacy.error) return { items: [], error: full.error.message };

  return {
    items: ((legacy.data ?? []) as unknown as Partial<VoiceInboxRow>[]).map((row) =>
      mapVoiceInboxRow({
        next_step: null,
        action_items: null,
        tags: null,
        people: null,
        kind: null,
        disposable: null,
        suggested_action: null,
        audio_path: null,
        ...row,
      } as VoiceInboxRow),
    ),
  };
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
    nextStep: row.next_step?.trim() && row.next_step.trim() !== "none" ? row.next_step.trim() : "",
    actionItems: toStringArray(row.action_items),
    tags: toStringArray(row.tags),
    people: toStringArray(row.people),
    kind: normalizeKind(row.kind),
    disposable: row.disposable === true,
    suggestedAction: normalizeSuggestedAction(row.suggested_action),
    hasAudio: Boolean(row.audio_path),
  };
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : [];
}

function normalizePriority(value: string | null): Priority {
  if (value === "high" || value === "medium" || value === "low") return value;
  return "medium";
}

function normalizeKind(value: string | null): CaptureKind | null {
  if (
    value === "task" ||
    value === "idea" ||
    value === "decision" ||
    value === "reference" ||
    value === "person-note"
  ) {
    return value;
  }
  return null;
}

function normalizeSuggestedAction(value: string | null): SuggestedAction {
  if (value === "keep_as_knowledge" || value === "dismiss") return value;
  return "file";
}
