# JesseOS app: what's in it (23 Nov 2026)

Live: https://jesseos-app.vercel.app/ (the same build as local, checked today).
The whole app is one page. It has three tabs and a Detail switch. Nothing is cut or restyled yet.

## The page, top to bottom

| Part | What it does | Status | Proposal |
|---|---|---|---|
| Top bar: JO mark + "Detail" switch | Name, and the switch into the board view | Used | Keep |
| Big headline "25 things are waiting for you" + paragraph | Count of captures to review | Used | Keep the count, cut the paragraph |
| Stats row (To review, Filed, Knowledge, Captured) | Four totals | Half: repeats the tab counts | Cut |
| **To review tab** (`shots/now-1-review.png`, `now-2-capture-cards.jpg`) | Each voice note: title, summary, next step, tags, File, Adjust, Keep, Dismiss, Full text, Play audio | **Used. The Voice Inbox. Keep** | Keep, restyle |
| Filters (priority, project) + keyboard shortcuts line | Narrow the list; j/k/f/x keys | Half: filters only open by default above 15 items | Keep, tuck away |
| **Filed tab** (`now-3-filed.jpg`) | Filed captures grouped by project, change priority, Archive | Used | Keep |
| Knowledge tab (`now-4-knowledge.jpg`) | Captures kept as knowledge | Dead: one test item ("Test Knowledge Packet") ever | Cut the tab. Keep the data |
| "Keep as knowledge" button on a capture | Copies a capture into the knowledge table | Half: wired, never used | Ask Jesse |
| Detail board (`now-5-detail-board.jpg`) | Full-width board, one column per project, critical strip on top | Half: built 19 Jul, unclear if used | Ask Jesse |
| Footer "Capture · review · remember." | Tagline | Dead | Cut |
| Broken captures ("Empty or failed transcription") | Shown at the top of To review | Noise | Auto-hide, or one tap to clear |

## Behind the page (keep, untouched)

- iPhone shortcut → `src/app/api/voice/ingest/route.ts` → Supabase `voice_inbox` table → To review tab. A capture landed at 6:58 this morning, so it works.
- Supabase tables: `voice_inbox`, `projects`, `knowledge_packets`. No schema change planned.

## Old code nobody sees (safe to delete, after a yes)

Left over from the v0.1 dashboard. Nothing on screen uses them:
`components/dashboard/sidebar.tsx`, `header.tsx`, `status-strip.tsx`, `dashboard-panel.tsx`, `empty-state.tsx`,
`status-badge.tsx`, `icons.tsx`, `features/voice-inbox/voice-inbox-panel.tsx`, `features/review-queue/*`
(reads a `review_queue` table the page never shows), `features/knowledge-packets/knowledge-packets-panel.tsx`.

## Three looks for the Voice Inbox screen

Mockups only, built from real capture titles. Open `mockups/looks.html?look=a` (or b, c) in a browser.

- **A. Graph night** (`shots/look-a-desktop.png`). Charcoal, like Obsidian's graph view. A small dot graph top right,
  one cluster per project. Each capture hangs off a thin line with its project's colour as the dot.
- **B. Deep network** (`shots/look-b-desktop.png`). Deep navy, glowing cyan network across the top, like the
  "second brain" frame. Captures sit in soft glass cards. Loudest of the three.
- **C. Night desk** (`shots/look-c-desktop.png`). Warm dark brown, amber, a serif for titles. Every capture shows
  its voice waveform and length on the left, so it reads as a voice inbox first. Not from the refs; a contrast option.

Rules for the build, once Jesse picks: the address and routes stay the same (HQ may link here), the ingest route and
data stay untouched, no schema change, no deploy without a yes.

## Built (23 Nov 2026)

Jesse picked **A. Graph night**. It's built on the branch `graph-night` (`shots/built-graph-night.png`).
It's a restyle only: same page, same tabs, same buttons, same address. Nothing is cut yet.
The live site stays on `main` until Jesse says to put it live.

## Tein look (23 Nov 2026, later)

Jesse switched to the Tein reference for this app. Mock: `mockups/tein-voice-inbox.html`, grab: `shots/tein-voice-inbox.png`.
Light grey page, white cards, blue accent, Archivo, left menu in groups, one dark button ("Review next"). Not built yet.

## Cuts done
- 23 Nov: "Scale Dashboard Service Across Clients" dismissed (status change only, row kept). Test of the cut list.
- 23 Nov: Tein look built on the branch `tein-look` (`shots/built-tein.png`). New frame: top bar, left menu (Voice inbox, Projects), breadcrumb, banner, title with count tags, "Review next" button. The graph art and the row of four totals are gone. Same address, same routes, same data. Live only after Jesse says yes.
- 23 Nov: dismissed "Dashboard Data Ball Time-Lapse Concept", "Cross-check Rich's Google Ads Claims", "Add Client Service Costs to Dashboard" (rows kept).
- 23 Nov: 22 more cut (16 to review dismissed, 6 filed archived, incl. the untitled 22 Jul capture). Rows kept.
- 23 Nov: 16 more cut (4 dismissed, 12 archived). 8 captures left: 1 to review, 7 filed. Test Knowledge Packet still there: removing it means deleting the row (no status column), waiting on Jesse's yes.
