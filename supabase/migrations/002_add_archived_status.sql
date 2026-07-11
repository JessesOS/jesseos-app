-- Add 'archived' as a valid voice_inbox status, for filed items Jesse wants
-- out of the way without permanently deleting them (reversible via 'filed'
-- again, unlike a hard delete).

alter table voice_inbox
  drop constraint if exists voice_inbox_status_check;

alter table voice_inbox
  add constraint voice_inbox_status_check
  check (status in ('queued', 'transcribing', 'pending_review', 'filed', 'dismissed', 'archived'));
