/**
 * One colour per project, used for the graph dots and the line each capture
 * hangs off. Known projects get a fixed colour; anything new gets a stable one
 * from the palette, picked from its name.
 */
const FIXED: Record<string, string> = {
  agencyos: "#a99bff", // violet
  customerjourney: "#6cb8f0", // sky
  content: "#6fd3a8", // mint
  personalos: "#d9b45f", // gold
  jesseos: "#f08aa8", // rose
  unsorted: "#6b6f78", // grey: not placed yet
};

const PALETTE = ["#a99bff", "#6fd3a8", "#6cb8f0", "#d9b45f", "#f08aa8", "#8fd0d9"];

export function projectColor(name: string | null | undefined): string {
  const key = (name ?? "").trim().toLowerCase();
  if (!key) return FIXED.unsorted;
  if (FIXED[key]) return FIXED[key];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
