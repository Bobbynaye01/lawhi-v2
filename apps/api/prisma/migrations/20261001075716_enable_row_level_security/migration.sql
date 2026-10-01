-- Supabase exposes every table of the "public" schema through its REST API
-- (PostgREST) to the anon/authenticated roles. Lawhi never uses that path: all
-- data access goes through the NestJS API, which connects as the table owner.
-- Enabling RLS without any policy denies everything to anon/authenticated,
-- while the owner (the API) is unaffected. Harmless on a plain PostgreSQL.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Surah" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Verse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Reciter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReadingPosition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Bookmark" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DhikrCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Dhikr" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Book" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BookChapter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BookEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DonationCause" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentMethod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Donation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DonationEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AppConfig" ENABLE ROW LEVEL SECURITY;

-- Prisma's own bookkeeping table (absent from Prisma's shadow database).
DO $lawhi$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
  END IF;
END
$lawhi$;
