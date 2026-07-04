import type { SupabaseClient } from "@supabase/supabase-js";
import type { SectionResult } from "@/features/shared/section-result";
import type {
  ReviewQueueItem,
  ReviewQueueRow,
  ReviewStatus,
} from "./types";

const REVIEW_QUEUE_COLUMNS =
  "id,title,classification,review_status,source_table";
const MAX_REVIEW_QUEUE_ITEMS = 5;

export async function getReviewQueueItems(
  supabase: SupabaseClient,
): Promise<SectionResult<ReviewQueueItem>> {
  const { data, error } = await supabase
    .from("review_queue")
    .select(REVIEW_QUEUE_COLUMNS)
    .limit(MAX_REVIEW_QUEUE_ITEMS);

  if (error) {
    return { items: [], error: error.message };
  }

  return {
    items: ((data ?? []) as ReviewQueueRow[]).map(mapReviewQueueRow),
  };
}

function mapReviewQueueRow(row: ReviewQueueRow): ReviewQueueItem {
  return {
    id: row.id,
    title: row.title ?? "Untitled item",
    classification: row.classification ?? "Unclassified",
    reviewStatus: normalizeReviewStatus(row.review_status),
    sourceTable: row.source_table ?? "review_queue",
  };
}

function normalizeReviewStatus(value: string | null): ReviewStatus {
  const normalized = value?.toLowerCase().replaceAll("_", " ") ?? "";

  if (normalized === "ready" || normalized === "approved") {
    return "ready";
  }

  if (normalized === "in progress" || normalized === "in review") {
    return "in progress";
  }

  return "needs review";
}
