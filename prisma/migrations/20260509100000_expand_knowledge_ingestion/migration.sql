ALTER TYPE "KnowledgeSourceType" ADD VALUE IF NOT EXISTS 'MARKDOWN';
ALTER TYPE "KnowledgeSourceType" ADD VALUE IF NOT EXISTS 'PDF';

ALTER TABLE "KnowledgeDocument"
  ADD COLUMN IF NOT EXISTS "sourceData" TEXT,
  ADD COLUMN IF NOT EXISTS "originalName" TEXT,
  ADD COLUMN IF NOT EXISTS "mimeType" TEXT;

DO $$
BEGIN
  CREATE INDEX "KnowledgeChunk_content_fts_idx"
    ON "KnowledgeChunk" USING GIN (to_tsvector('simple', "content"));
EXCEPTION
  WHEN duplicate_table THEN
    NULL;
END $$;
