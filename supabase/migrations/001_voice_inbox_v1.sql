-- Voice Inbox v1 (code-native rebuild) — additive schema changes
-- Run this once in the Supabase SQL Editor for the JesseOS project.
-- Safe to re-run: every statement uses IF NOT EXISTS / OR REPLACE guards.

-- New columns on voice_inbox for the async capture -> transcribe -> structure -> review flow
alter table voice_inbox
  add column if not exists audio_path text,
  add column if not exists transcript text,
  add column if not exists next_step text,
  add column if not exists reviewed_at timestamptz;

-- Normalize legacy status values from the old Make.com flow before constraining.
-- Old captures used status 'Inbox' — they are exactly "captured, awaiting review".
update voice_inbox set status = 'pending_review'
  where status is null or status not in
    ('queued', 'transcribing', 'pending_review', 'filed', 'dismissed');

-- Formalize status as a checked enum-like text column (kept as text for simplicity,
-- constrained via check so existing rows/tools that expect a string keep working)
alter table voice_inbox
  drop constraint if exists voice_inbox_status_check;

alter table voice_inbox
  add constraint voice_inbox_status_check
  check (status in ('queued', 'transcribing', 'pending_review', 'filed', 'dismissed'));

-- Storage bucket for raw audio recordings (private — only the service role reads/writes it)
insert into storage.buckets (id, name, public)
values ('voice-audio', 'voice-audio', false)
on conflict (id) do nothing;
