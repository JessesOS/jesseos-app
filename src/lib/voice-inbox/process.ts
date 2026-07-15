import "server-only";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getActiveProjects } from "@/features/projects/data";
import type { Project } from "@/features/projects/types";

/**
 * Turns a raw audio recording into a structured, reviewable voice_inbox row.
 *
 * Two AI calls, deliberately split:
 *  - OpenAI does transcription only (audio -> text). Anthropic has no audio API,
 *    so this step has to stay on OpenAI.
 *  - Claude does the structuring (text -> title/summary/tags/etc). Keeps the
 *    "thinking" work on the model JesseOS is standardized on.
 *
 * The structuring call is context-aware: it sees the live projects table and
 * the most recent reviewed captures, so classification connects to what
 * actually exists instead of guessing from a frozen list.
 */

const KINDS = ["task", "idea", "decision", "reference", "person-note"] as const;
const SUGGESTED_ACTIONS = ["file", "keep_as_knowledge", "dismiss"] as const;

type StructuredCapture = {
  title: string;
  summary: string;
  project_bucket: string;
  priority: "high" | "medium" | "low";
  kind: (typeof KINDS)[number];
  disposable: boolean;
  suggested_action: (typeof SUGGESTED_ACTIONS)[number];
  action_items: string[];
  tags: string[];
  people: string[];
  next_step: string;
};

type RecentCapture = {
  title: string | null;
  project_bucket: string | null;
  kind: string | null;
};

export async function processVoiceInboxItem(
  supabase: SupabaseClient,
  voiceInboxId: string,
  audioBuffer: Buffer,
  audioFilename: string,
) {
  const openai = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
  const anthropic = new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") });

  await supabase
    .from("voice_inbox")
    .update({ status: "transcribing" })
    .eq("id", voiceInboxId);

  // Step 1 — transcribe (OpenAI; Anthropic has no audio transcription API)
  const transcriptionFile = await toUploadable(audioBuffer, audioFilename);
  const transcription = await openai.audio.transcriptions.create({
    file: transcriptionFile,
    model: "gpt-4o-mini-transcribe",
  });
  const transcript = transcription.text?.trim();

  if (!transcript) {
    const emptyUpdate = {
      status: "pending_review",
      transcript: "",
      title: "Empty or failed transcription",
      summary: "No speech was detected in this recording — review the audio directly.",
    };
    const { error } = await supabase
      .from("voice_inbox")
      .update({ ...emptyUpdate, disposable: true, suggested_action: "dismiss" })
      .eq("id", voiceInboxId);
    if (error) {
      // Pre-migration-003 fallback — never lose a capture over missing columns.
      await supabase.from("voice_inbox").update(emptyUpdate).eq("id", voiceInboxId);
    }
    return;
  }

  // Step 2 — structure (Claude), with live context
  const [projects, recent] = await Promise.all([
    getActiveProjects(supabase),
    getRecentReviewedCaptures(supabase),
  ]);
  const structured = await structureTranscript(anthropic, transcript, projects, recent);

  const fullUpdate = {
    transcript,
    raw_text: transcript,
    title: structured.title,
    summary: structured.summary,
    project_bucket: structured.project_bucket,
    priority: structured.priority,
    kind: structured.kind,
    disposable: structured.disposable,
    suggested_action: structured.suggested_action,
    action_items: structured.action_items,
    tags: structured.tags,
    people: structured.people,
    next_step: structured.next_step,
    status: "pending_review",
  };

  const { error } = await supabase
    .from("voice_inbox")
    .update(fullUpdate)
    .eq("id", voiceInboxId);

  if (error) {
    // Migration 003 not run yet (new columns missing) — never lose a capture:
    // retry with only the columns that have always existed.
    const { kind, disposable, suggested_action, action_items, tags, people, ...legacyUpdate } =
      fullUpdate;
    void kind;
    void disposable;
    void suggested_action;
    void action_items;
    void tags;
    void people;
    await supabase.from("voice_inbox").update(legacyUpdate).eq("id", voiceInboxId);
  }
}

/** Recent decisions give the classifier continuity across captures. */
async function getRecentReviewedCaptures(
  supabase: SupabaseClient,
): Promise<RecentCapture[]> {
  const { data } = await supabase
    .from("voice_inbox")
    .select("title,project_bucket,kind")
    .in("status", ["filed", "dismissed"])
    .order("reviewed_at", { ascending: false })
    .limit(15);
  return (data as RecentCapture[] | null) ?? [];
}

async function structureTranscript(
  anthropic: Anthropic,
  transcript: string,
  projects: Project[],
  recent: RecentCapture[],
): Promise<StructuredCapture> {
  const projectLines = projects
    .map((p) => {
      const aliasNote = p.aliases.length > 0 ? ` (aka: ${p.aliases.join(", ")})` : "";
      const domain = p.domain ? ` [${p.domain}]` : "";
      return `- ${p.name}${domain}${aliasNote}: ${p.description || "no description"}`;
    })
    .join("\n");

  const recentLines =
    recent.length > 0
      ? recent
          .map((r) => `- "${r.title ?? "untitled"}" -> ${r.project_bucket ?? "unsorted"}${r.kind ? ` (${r.kind})` : ""}`)
          .join("\n")
      : "(none yet)";

  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    system:
      "You structure raw voice-note transcripts for JesseOS, a personal/business operating " +
      "system. Respond with ONLY a JSON object, no prose, matching this exact shape: " +
      '{"title": string, "summary": string, "project_bucket": string, "priority": "high"|"medium"|"low", ' +
      '"kind": "task"|"idea"|"decision"|"reference"|"person-note", "disposable": boolean, ' +
      '"suggested_action": "file"|"keep_as_knowledge"|"dismiss", ' +
      '"action_items": string[], "tags": string[], "people": string[], "next_step": string}.\n\n' +
      "PROJECTS — project_bucket must be exactly one of these names. Pick using the descriptions; " +
      'use "unsorted" only if genuinely unclear:\n' +
      `${projectLines}\n\n` +
      "RECENT CAPTURES — the user's latest reviewed notes, for continuity. If this note continues " +
      "or relates to one of these, classify consistently with it:\n" +
      `${recentLines}\n\n` +
      "PRIORITY RUBRIC — high: names a person plus a commitment, mentions a date/deadline, or blocks " +
      "an active project. low: a someday-idea with no actor or urgency. medium: everything else.\n\n" +
      "KIND — task: something to do. idea: a concept to explore. decision: a choice made or needed. " +
      "reference: information worth keeping. person-note: primarily about a person.\n\n" +
      "SUGGESTED_ACTION — file: actionable or project-relevant. keep_as_knowledge: enduring reference " +
      "material worth reusing. dismiss: no substantive content.\n\n" +
      "DISPOSABLE — true only when the note has no usable content (background noise, laughter, " +
      "accidental recording).\n\n" +
      "Keep title under 8 words and summary under 2 sentences. If there's no clear action, " +
      'next_step can be "none".',
    messages: [{ role: "user", content: transcript }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";

  return parseStructuredCapture(raw, projects);
}

function parseStructuredCapture(raw: string, projects: Project[]): StructuredCapture {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

  const projectNames = new Set(projects.map((p) => p.name));

  return {
    title: typeof parsed.title === "string" ? parsed.title : "Untitled capture",
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    project_bucket:
      typeof parsed.project_bucket === "string" && projectNames.has(parsed.project_bucket)
        ? parsed.project_bucket
        : "unsorted",
    priority: ["high", "medium", "low"].includes(parsed.priority) ? parsed.priority : "medium",
    kind: KINDS.includes(parsed.kind) ? parsed.kind : "idea",
    disposable: parsed.disposable === true,
    suggested_action: SUGGESTED_ACTIONS.includes(parsed.suggested_action)
      ? parsed.suggested_action
      : "file",
    action_items: toStringArray(parsed.action_items),
    tags: toStringArray(parsed.tags),
    people: toStringArray(parsed.people),
    next_step: typeof parsed.next_step === "string" ? parsed.next_step : "none",
  };
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

async function toUploadable(buffer: Buffer, filename: string) {
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
  return await OpenAI.toFile(arrayBuffer as ArrayBuffer, filename);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}
