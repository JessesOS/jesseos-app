/**
 * One colour per project, used for the graph dots and the line each capture
 * hangs off. Known projects get a fixed colour; anything new gets a stable one
 * from the palette, picked from its name.
 */
const FIXED: Record<string, string> = {
  agencyos: "#5b4fd6", // violet
  customerjourney: "#1f6fb8", // sky
  content: "#1f8a5c", // mint
  personalos: "#9a6f12", // gold
  jesseos: "#b8406a", // rose
  unsorted: "#8a8f99", // grey: not placed yet
};

const PALETTE = ["#5b4fd6", "#1f8a5c", "#1f6fb8", "#9a6f12", "#b8406a", "#1d7f8c"];

export function projectColor(name: string | null | undefined): string {
  const key = (name ?? "").trim().toLowerCase();
  if (!key) return FIXED.unsorted;
  if (FIXED[key]) return FIXED[key];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
