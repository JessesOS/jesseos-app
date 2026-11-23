# Voice intake: product review and proposal (23 Nov 2026, Master session)

Jesse asked for a logic, architecture and design pass: "There's got to be a better way to do it." This compares the
app with the best voice-capture products and proposes a simpler model. **Proposal only. Nothing built.**

## How it works today
- **Capture:** iPhone shortcut → `api/voice/ingest` → audio to Supabase storage → transcribed (gpt-4o-mini-transcribe)
  → Claude writes a title, summary, project, priority, kind, tags, people, action items, next step and suggested
  action.
- **Then Jesse reviews every capture by hand.** Six statuses (queued, transcribing, pending_review, filed, dismissed,
  archived), plus a separate Knowledge table, a Detail board, and per-project counts.
- **What happened:** 50 captures piled up, the counts stopped matching, and he cut 42 in one night. That's the classic
  failure in this category: a review-everything queue that turns into "AI bankruptcy" (Bee pendant reviews say the
  same).
- **Where it ends:** in the app. Filed items don't go anywhere Jesse works (HQ, the project's files, a to-do list).

## What the best ones do (Cleft, Voicenotes, Todoist Ramble, Granola, AudioPen; sources in the research below)
1. **One tap to record from anywhere:** Action Button, widget, watch, Mac shortcut. Speed beats clever AI.
2. **The original is always kept** next to the AI version (audio and transcript).
3. **One ramble becomes several items:** tasks, ideas and drafts split out.
4. **The AI files into places you already have** and never invents new buckets (Ramble).
5. **Fixing is one tap.** "Easy correction beats perfect first-time accuracy" (the Todoist team).
6. **The output goes where the work happens:** the to-do app, the project, or a draft to copy.
7. **Search first.** Few counts, no deep folders.
8. **The AI only acts on its own when it's sure and the action can be undone.** Unsure items, and anything that sends,
   spends or deletes, wait for a yes.

## Proposal: three states, one count
| State | What it means | Who moves it |
|---|---|---|
| **New** | Captured and processed. If the AI was sure, it's already filed. | The AI |
| **Needs you** | Only what the AI was unsure about, or anything that would send, spend or delete. | You |
| **Done** | Filed, acted on, or dismissed. Records who did it (the AI, you, or dismissed). | Either |

- **One number on screen:** "Needs you". Everything else is found with search and filters.
- **Auto-tidy:** anything left in Needs you after 7 days moves to Done as dismissed. It can be brought back.
- **Split on capture:** each action item becomes its own item, linked to the original recording.
- **Weekly check:** how often Jesse overrode the AI, which shows whether to trust it more or less.

## Where it should land (the JesseOS part)
Markdown is canonical, and HQ is the one screen. So the voice app should be **the inbox, not the destination**:
- **A task for a client or project** → a line in that project's `STATUS.md` under "Waiting on Jesse", which HQ already
  reads and shows on Today.
- **An idea** → a dated note in the project's `notes/` (e.g. the content ideas file).
- **Something about a person** → the person's file in the brain.
- **Personal or Life** → Life's own inbox, never mixed with work. Life stays private.
- **Supabase keeps the audio, the transcript and the log**, so nothing is lost and every filing can be undone.

The app then only needs: **Record** (the shortcut), **Needs you** (the queue), **Search** (everything), and HQ's Today
shows the one count. The Knowledge tab and the Detail board go (HQ and the brain do those jobs).

## What to cut, keep and add
- **Keep:** the ingest route, the audio and transcript, the Claude structuring (it already returns action items and a
  suggested action, so most of the logic is there), the project list.
- **Cut:** the Knowledge tab, the Detail board, "archived" as a separate state, per-project counts on every view.
- **Add:** a confidence score from the AI, auto-filing above it, splitting into items, writing to STATUS lines and
  notes, the 7-day auto-tidy, and a Home Screen widget, watch and Mac shortcut for capture.

## Suggested order (small steps)
1. **Mock the flow:** Needs you, Done, and Search on the Tein look, with real captures. Jesse clicks through it.
2. **Status model:** move to New / Needs you / Done, mapped from the six states. Old rows stay.
3. **Confidence and auto-file:** start strict (only notes and tasks for existing projects), then widen.
4. **Write-out:** to STATUS lines and notes. HQ shows the "Needs you" count on Today.
5. **Capture:** widget, watch, Mac shortcut.

Research sources: learn.cleftnotes.com/changelog, help.voicenotes.com (release notes), audiopen.ai, letterly.app,
producttalk.org (Building Todoist Ramble), granola.ai, Forbes and craftnote.com wearables roundups, elementum.ai,
velt.dev and neotalogic.com on human-in-the-loop review.
