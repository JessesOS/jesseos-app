import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server-client";
import { processVoiceInboxItem } from "@/lib/voice-inbox/process";

export const runtime = "nodejs";
export const maxDuration = 300; // long recordings need room to transcribe + structure

/**
 * Voice Inbox capture endpoint. The iOS Shortcut posts a recorded audio file
 * here with a shared-secret token. This replaces the old iOS-dictation cap
 * (~90s) — recordings of any length are accepted, stored, transcribed, and
 * structured before landing in the Review Queue.
 */
export async function POST(request: NextRequest) {
  const token = request.headers.get("x-voice-ingest-token");
  const expectedToken = process.env.VOICE_INGEST_TOKEN;

  if (!expectedToken) {
    return NextResponse.json(
      { error: "Server misconfigured: VOICE_INGEST_TOKEN is not set" },
      { status: 500 },
    );
  }

  if (!token || token !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const audioFile = formData.get("audio");

  if (!(audioFile instanceof File)) {
    return NextResponse.json(
      { error: "Missing 'audio' file in form data" },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServiceClient();
  const arrayBuffer = await audioFile.arrayBuffer();
  const audioBuffer = Buffer.from(arrayBuffer);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const extension = audioFile.name.includes(".") ? audioFile.name.split(".").pop() : "m4a";
  const audioPath = `voice-inbox/${timestamp}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("voice-audio")
    .upload(audioPath, audioBuffer, {
      contentType: audioFile.type || "audio/m4a",
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Storage upload failed: ${uploadError.message}` },
      { status: 500 },
    );
  }

  const { data: inserted, error: insertError } = await supabase
    .from("voice_inbox")
    .insert({
      status: "queued",
      audio_path: audioPath,
      source: "voice",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: `Failed to create voice_inbox row: ${insertError?.message}` },
      { status: 500 },
    );
  }

  // Process inline for Phase 1 (see process.ts doc comment). If this route ever
  // starts timing out on very long recordings, split this into a queued job
  // instead of making the request wait for it.
  try {
    await processVoiceInboxItem(supabase, inserted.id, audioBuffer, audioFile.name);
  } catch (error) {
    await supabase
      .from("voice_inbox")
      .update({
        status: "pending_review",
        summary: `Processing failed: ${error instanceof Error ? error.message : "unknown error"}`,
      })
      .eq("id", inserted.id);

    return NextResponse.json(
      { id: inserted.id, warning: "Captured, but processing failed — check the dashboard." },
      { status: 202 },
    );
  }

  return NextResponse.json({ id: inserted.id, status: "pending_review" });
}
