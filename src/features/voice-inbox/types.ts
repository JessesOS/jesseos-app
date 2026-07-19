// "critical" is human-assigned only — the AI structuring step never proposes it
// (see process.ts), so it stays a deliberate daily-curation act.
export type Priority = "critical" | "high" | "medium" | "low";

export type CaptureKind = "task" | "idea" | "decision" | "reference" | "person-note";

export type SuggestedAction = "file" | "keep_as_knowledge" | "dismiss";

export type VoiceInboxItem = {
  id: string;
  title: string;
  summary: string;
  fullText: string;
  priority: Priority;
  projectBucket: string;
  createdAt: string;
  nextStep: string;
  actionItems: string[];
  tags: string[];
  people: string[];
  kind: CaptureKind | null;
  disposable: boolean;
  suggestedAction: SuggestedAction;
  hasAudio: boolean;
};

export type VoiceInboxRow = {
  id: string;
  created_at: string | null;
  title: string | null;
  summary: string | null;
  raw_text: string | null;
  transcript: string | null;
  priority: string | null;
  project_bucket: string | null;
  next_step: string | null;
  action_items: unknown;
  tags: unknown;
  people: unknown;
  kind: string | null;
  disposable: boolean | null;
  suggested_action: string | null;
  audio_path: string | null;
};
