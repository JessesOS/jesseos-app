export type KnowledgePacketItem = {
  id: string;
  title: string;
  summary: string;
  createdAt: string;
  projectBucket: string;
};

export type KnowledgePacketRow = {
  id: string;
  created_at: string | null;
  title: string | null;
  summary: string | null;
  project_bucket: string | null;
};
