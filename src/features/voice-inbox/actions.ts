"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/server-client";
import type { ActionResult } from "./buckets";

/** Accept a capture (optionally correcting its bucket/priority) and file it. */
export async function fileCapture(
  id: string,
  projectBucket?: string,
  priority?: string,
): Promise<ActionResult> {
  try {
    const supabase = createSupabaseServiceClient();
    const update: Record<string, unknown> = {
      status: "filed",
      reviewed_at: new Date().toISOString(),
    };
    if (projectBucket) update.project_bucket = projectBucket;
    if (priority) update.priority = priority;

    const { error } = await supabase.from("voice_inbox").update(update).eq("id", id);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/** Change priority on an already-filed capture — doesn't touch status/bucket. */
export async function updatePriority(id: string, priority: string): Promise<ActionResult> {
  try {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from("voice_inbox").update({ priority }).eq("id", id);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/** Archive a filed item — gets it out of the Filed view, reversible (not a delete). */
export async function archiveCapture(id: string): Promise<ActionResult> {
  try {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase
      .from("voice_inbox")
      .update({ status: "archived" })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/** Restore an archived item back to Filed. */
export async function unarchiveCapture(id: string): Promise<ActionResult> {
  try {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase
      .from("voice_inbox")
      .update({ status: "filed" })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/** Undo a review decision — send the capture back to the inbox. */
export async function undoReview(id: string): Promise<ActionResult> {
  try {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase
      .from("voice_inbox")
      .update({ status: "pending_review", reviewed_at: null })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/** Dismiss a capture — keep the record, remove it from the inbox. */
export async function dismissCapture(id: string): Promise<ActionResult> {
  try {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase
      .from("voice_inbox")
      .update({ status: "dismissed", reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/** File a capture AND keep it as enduring knowledge. */
export async function promoteCapture(
  id: string,
  projectBucket?: string,
  priority?: string,
): Promise<ActionResult> {
  try {
    const supabase = createSupabaseServiceClient();

    const { data: row, error: readError } = await supabase
      .from("voice_inbox")
      .select("title,summary,project_bucket")
      .eq("id", id)
      .single();
    if (readError || !row) {
      return { ok: false, error: readError?.message ?? "Capture not found" };
    }

    const bucket = projectBucket ?? row.project_bucket ?? "unsorted";

    const { error: insertError } = await supabase.from("knowledge_packets").insert({
      title: row.title,
      summary: row.summary,
      project_bucket: bucket,
    });
    if (insertError) return { ok: false, error: insertError.message };

    const update: Record<string, unknown> = {
      status: "filed",
      project_bucket: bucket,
      reviewed_at: new Date().toISOString(),
    };
    if (priority) update.priority = priority;

    const { error: updateError } = await supabase
      .from("voice_inbox")
      .update(update)
      .eq("id", id);
    if (updateError) return { ok: false, error: updateError.message };

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
