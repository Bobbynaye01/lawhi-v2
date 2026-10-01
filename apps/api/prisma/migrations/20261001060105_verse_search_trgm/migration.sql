-- Trigram search on normalized verse text (pg_trgm is available on Supabase).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateIndex
CREATE INDEX "Verse_textSearch_idx" ON "Verse" USING GIN ("textSearch" gin_trgm_ops);
