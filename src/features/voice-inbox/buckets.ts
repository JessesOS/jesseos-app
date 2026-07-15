/**
 * Fallback project names, used only when the projects table can't be read
 * (e.g. migration 003 not yet run). The live list comes from
 * features/projects/data.ts. Kept in a plain module (not the "use server"
 * actions file, where every export must be an async action) so both client
 * and server can import it.
 */
export const FALLBACK_PROJECT_NAMES = [
  "agencyos",
  "personalos",
  "jesseos",
  "customerjourney",
  "unsorted",
] as const;

export type ActionResult = { ok: true } | { ok: false; error: string };
