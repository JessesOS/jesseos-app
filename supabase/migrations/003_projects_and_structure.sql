-- Voice Inbox v2 — projects become data, richer capture structure.
-- Run once in the Supabase SQL Editor. Safe to re-run: every statement is guarded.

-- 1. Projects table — the live list the AI classifies into and the UI files into.
--    Replaces the PROJECT_BUCKETS constant hardcoded in the app.
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  domain text check (domain in ('work', 'personal', 'jesseos')),
  description text,
  aliases jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);

-- Seed with the real JesseOS projects (descriptions feed the AI prompt).
insert into projects (name, domain, description, aliases) values
  ('agencyos', 'work',
   'RT Digital agency operating system — client work, sales calls, delivery, team ops. People: Rich, Michelle, Scott, Chris McBrain, Dr. Damp, Trade AI.',
   '["rt digital", "agency", "rtd"]'::jsonb),
  ('customerjourney', 'work',
   'Customer journey and onboarding experience for RT Digital clients — onboarding videos, LeadConnector, CSM dashboard.',
   '["customer journey", "onboarding", "csm"]'::jsonb),
  ('personalos', 'personal',
   'Personal life — health, family, home, finances, personal creative projects.',
   '["personal"]'::jsonb),
  ('jesseos', 'jesseos',
   'JesseOS itself — the capture/review system, dashboard, voice inbox, architecture.',
   '["dashboard", "voice inbox", "system"]'::jsonb),
  ('unsorted', null,
   'Fallback when a capture genuinely fits no project.',
   '[]'::jsonb)
on conflict (name) do nothing;

-- 2. tags / people / action_items -> jsonb arrays (they hold structured lists,
--    were originally created as text). Converts whatever shape is found.
do $$
declare
  col text;
  coltype text;
begin
  foreach col in array array['tags', 'people', 'action_items'] loop
    select data_type into coltype
      from information_schema.columns
      where table_name = 'voice_inbox' and column_name = col;

    if coltype is null then
      execute format(
        'alter table voice_inbox add column %I jsonb not null default ''[]''::jsonb', col);
    elsif coltype = 'text' then
      execute format(
        $sql$alter table voice_inbox alter column %1$I type jsonb using
          case
            when %1$I is null or btrim(%1$I) = '' then '[]'::jsonb
            when %1$I ~ '^\s*\[' then %1$I::jsonb
            else to_jsonb(regexp_split_to_array(btrim(%1$I), '\s*,\s*'))
          end$sql$, col);
      execute format(
        'alter table voice_inbox alter column %I set default ''[]''::jsonb', col);
    elsif coltype = 'ARRAY' then
      execute format(
        'alter table voice_inbox alter column %1$I type jsonb using to_jsonb(%1$I)', col);
      execute format(
        'alter table voice_inbox alter column %I set default ''[]''::jsonb', col);
    end if;
    -- already jsonb: nothing to do
  end loop;
end $$;

-- 3. New structure fields written by the AI structuring step.
alter table voice_inbox
  add column if not exists kind text,
  add column if not exists disposable boolean not null default false,
  add column if not exists suggested_action text;

alter table voice_inbox
  drop constraint if exists voice_inbox_kind_check;
alter table voice_inbox
  add constraint voice_inbox_kind_check
  check (kind is null or kind in ('task', 'idea', 'decision', 'reference', 'person-note'));

alter table voice_inbox
  drop constraint if exists voice_inbox_suggested_action_check;
alter table voice_inbox
  add constraint voice_inbox_suggested_action_check
  check (suggested_action is null or suggested_action in ('file', 'keep_as_knowledge', 'dismiss'));
