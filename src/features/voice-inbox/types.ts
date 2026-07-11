export type Priority = "high" | "medium" | "low";

export type VoiceInboxItem = {
  id: string;
  title: string;
  summary: string;
  priority: Priority;
  projectBucket: string;
  createdAt: string;
};

export type VoiceInboxRow = {
  id: string;
  created_at: string | null;
  title: string | null;
  summary: string | null;
  priority: string | null;
  project_bucket: string | null;
};
