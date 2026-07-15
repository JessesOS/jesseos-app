import type { SupabaseClient } from "@supabase/supabase-js";
import { FALLBACK_PROJECT_NAMES } from "@/features/voice-inbox/buckets";
import type { Project, ProjectDomain, ProjectRow } from "./types";

/**
 * The live project list — what the AI classifies captures into and the UI
 * files them into. Falls back to the historical hardcoded names if the
 * projects table isn't reachable (e.g. migration 003 not run yet).
 */
export async function getActiveProjects(supabase: SupabaseClient): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id,name,domain,description,aliases")
    .eq("status", "active")
    .order("name");

  if (error || !data || data.length === 0) {
    return FALLBACK_PROJECT_NAMES.map((name) => ({
      id: name,
      name,
      domain: null,
      description: "",
      aliases: [],
    }));
  }

  return (data as ProjectRow[]).map(mapProjectRow);
}

function mapProjectRow(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    domain: normalizeDomain(row.domain),
    description: row.description ?? "",
    aliases: Array.isArray(row.aliases)
      ? row.aliases.filter((a): a is string => typeof a === "string")
      : [],
  };
}

function normalizeDomain(value: string | null): ProjectDomain | null {
  if (value === "work" || value === "personal" || value === "jesseos") return value;
  return null;
}
