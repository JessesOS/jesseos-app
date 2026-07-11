import "server-only";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Turns a raw audio recording into a structured, reviewable voice_inbox row.
 *
 * Two AI calls, deliberately split:
 *  - OpenAI does transcription only (audio -> text). Anthropic has no audio API,
 *    so this step has to stay on OpenAI.
 *  - Claude does the structuring (text -> title/summary/tags/etc). Keeps the
 *    "thinking" work on the model JesseOS is standardized on.
 */

const PROJECT_BUCKETS = [
  "agencyos",
  "personalos",
  "jesseos",
  "customerjourney",
] as const;

type StructuredCapture = {
  title: string;
  summary: string;
  project_bucket: string;
  priority: "high" | "medium" | "low";
  action_items: string[];
  tags: string[];
  people: string[];
  next_step: string;
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
    await supabase
      .from("voice_inbox")
      .update({
        status: "pending_review",
        transcript: "",
        title: "Empty or failed transcription",
        summary: "No speech was detected in this recording — review the audio directly.",
      })
      .eq("id", voiceInboxId);
    return;
  }

  // Step 2 — structure (Claude)
  const structured = await structureTranscript(anthropic, transcript);

  await supabase
    .from("voice_inbox")
    .update({
      transcript,
      raw_text: transcript,
      title: structured.title,
      summary: structured.summary,
      project_bucket: structured.project_bucket,
      priority: structured.priority,
      action_items: structured.action_items,
      tags: structured.tags,
      people: structured.people,
      next_step: structured.next_step,
      status: "pending_review",
    })
    .eq("id", voiceInboxId);
}

async function structureTranscript(
  anthropic: Anthropic,
  transcript: string,
): Promise<StructuredCapture> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    system:
      "You structure raw voice-note transcripts for JesseOS, a personal/business operating " +
      "system. Respond with ONLY a JSON object, no prose, matching this exact shape: " +
      '{"title": string, "summary": string, "project_bucket": string, "priority": "high"|"medium"|"low", ' +
      '"action_items": string[], "tags": string[], "people": string[], "next_step": string}. ' +
      `project_bucket must be one of: ${PROJECT_BUCKETS.join(", ")}, or "unsorted" if genuinely unclear. ` +
      "Keep title under 8 words and summary under 2 sentences. If there's no clear action, " +
      'next_step can be "none".',
    messages: [{ role: "user", content: transcript }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";

  return parseStructuredCapture(raw);
}

function parseStructuredCapture(raw: string): StructuredCapture {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

  return {
    title: typeof parsed.title === "string" ? parsed.title : "Untitled capture",
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    project_bucket:
      typeof parsed.project_bucket === "string" ? parsed.project_bucket : "unsorted",
    priority: ["high", "medium", "low"].includes(parsed.priority) ? parsed.priority : "medium",
    action_items: Array.isArray(parsed.action_items) ? parsed.action_items : [],
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    people: Array.isArray(parsed.people) ? parsed.people : [],
    next_step: typeof parsed.next_step === "string" ? parsed.next_step : "none",
  };
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
