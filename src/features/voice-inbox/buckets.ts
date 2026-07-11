/**
 * Canonical project buckets a capture can be filed into — the real JesseOS
 * projects. Kept in a plain module (not the "use server" actions file, where
 * every export must be an async action) so both client and server can import it.
 */
export const PROJECT_BUCKETS = [
  "agencyos",
  "personalos",
  "jesseos",
  "customerjourney",
  "unsorted",
] as const;

export type ActionResult = { ok: true } | { ok: false; error: string };
