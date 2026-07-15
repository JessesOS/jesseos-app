export type ProjectDomain = "work" | "personal" | "jesseos";

export type Project = {
  id: string;
  name: string;
  domain: ProjectDomain | null;
  description: string;
  aliases: string[];
};

export type ProjectRow = {
  id: string;
  name: string;
  domain: string | null;
  description: string | null;
  aliases: unknown;
};
