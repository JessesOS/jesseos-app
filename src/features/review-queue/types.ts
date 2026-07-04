export type ReviewStatus = "needs review" | "in progress" | "ready";

export type ReviewQueueItem = {
  id: string;
  title: string;
  classification: string;
  reviewStatus: ReviewStatus;
  sourceTable: string;
};

export type ReviewQueueRow = {
  id: string;
  title: string | null;
  classification: string | null;
  review_status: string | null;
  source_table: string | null;
};
