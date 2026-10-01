-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('active', 'deactivated');

-- CreateEnum
CREATE TYPE "ThemePreference" AS ENUM ('system', 'light', 'dark');

-- CreateEnum
CREATE TYPE "NotificationMode" AS ENUM ('off', 'notification', 'adhan');

-- CreateEnum
CREATE TYPE "Riwaya" AS ENUM ('hafs', 'warsh');

-- CreateEnum
CREATE TYPE "RevelationPlace" AS ENUM ('makkah', 'madinah');

-- CreateEnum
CREATE TYPE "AudioProvider" AS ENUM ('everyayah');

-- CreateEnum
CREATE TYPE "DhikrKind" AS ENUM ('adhkar', 'dua');

-- CreateEnum
CREATE TYPE "BookFormat" AS ENUM ('pdf', 'text');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('MRU');

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('pending', 'submitted', 'confirmed', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentOperator" AS ENUM ('bankily', 'masrivi', 'bimbank', 'click', 'sedad', 'bamis_digital', 'bci_pay');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "role" "Role" NOT NULL DEFAULT 'user',
    "status" "AccountStatus" NOT NULL DEFAULT 'active',
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "userId" UUID NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'ar',
    "riwaya" "Riwaya" NOT NULL DEFAULT 'hafs',
    "reciterId" TEXT,
    "fontScale" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "theme" "ThemePreference" NOT NULL DEFAULT 'system',
    "prayerMethod" TEXT NOT NULL DEFAULT 'MuslimWorldLeague',
    "madhab" TEXT NOT NULL DEFAULT 'shafi',
    "notificationMode" "NotificationMode" NOT NULL DEFAULT 'notification',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Surah" (
    "id" INTEGER NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameTranslit" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "revelationPlace" "RevelationPlace" NOT NULL,
    "bismillahPre" BOOLEAN NOT NULL,
    "versesHafs" INTEGER NOT NULL,
    "versesWarsh" INTEGER NOT NULL,

    CONSTRAINT "Surah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verse" (
    "id" SERIAL NOT NULL,
    "riwaya" "Riwaya" NOT NULL,
    "surah" INTEGER NOT NULL,
    "verse" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "textSearch" TEXT NOT NULL,
    "page" INTEGER NOT NULL,
    "juz" INTEGER NOT NULL,
    "hizb" INTEGER NOT NULL,
    "rub" INTEGER NOT NULL,
    "sajda" BOOLEAN NOT NULL DEFAULT false,
    "hafsVerses" INTEGER[],

    CONSTRAINT "Verse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reciter" (
    "id" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "riwaya" "Riwaya" NOT NULL,
    "provider" "AudioProvider" NOT NULL,
    "folder" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "verifiedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Reciter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingPosition" (
    "userId" UUID NOT NULL,
    "riwaya" "Riwaya" NOT NULL,
    "surah" INTEGER NOT NULL,
    "verse" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadingPosition_pkey" PRIMARY KEY ("userId","riwaya")
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "riwaya" "Riwaya" NOT NULL,
    "surah" INTEGER NOT NULL,
    "verse" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DhikrCategory" (
    "id" TEXT NOT NULL,
    "kind" "DhikrKind" NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleFr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "DhikrCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dhikr" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "title" TEXT,
    "arabicText" TEXT NOT NULL,
    "translationFr" TEXT,
    "translationEn" TEXT,
    "repetitions" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT NOT NULL,
    "virtue" TEXT,

    CONSTRAINT "Dhikr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleFr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "authorAr" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "format" "BookFormat" NOT NULL,
    "pdfUrl" TEXT,
    "isExcerpt" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookChapter" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "BookChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookEntry" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "narrator" TEXT,
    "reference" TEXT,

    CONSTRAINT "BookEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonationCause" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleFr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "descriptionAr" TEXT NOT NULL,
    "descriptionFr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "goalAmount" INTEGER,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DonationCause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "operator" "PaymentOperator" NOT NULL,
    "phoneNumber" TEXT,
    "instructions" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'MRU',
    "donorName" TEXT,
    "donorPhone" TEXT,
    "userId" UUID NOT NULL,
    "causeId" UUID NOT NULL,
    "paymentMethodId" UUID NOT NULL,
    "reference" TEXT,
    "status" "DonationStatus" NOT NULL DEFAULT 'pending',
    "proofPath" TEXT,
    "rejectionReason" TEXT,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonationEvent" (
    "id" UUID NOT NULL,
    "donationId" UUID NOT NULL,
    "fromStatus" "DonationStatus",
    "toStatus" "DonationStatus" NOT NULL,
    "actorId" UUID,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DonationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppConfig" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Verse_riwaya_juz_idx" ON "Verse"("riwaya", "juz");

-- CreateIndex
CREATE INDEX "Verse_riwaya_hizb_idx" ON "Verse"("riwaya", "hizb");

-- CreateIndex
CREATE INDEX "Verse_riwaya_rub_idx" ON "Verse"("riwaya", "rub");

-- CreateIndex
CREATE INDEX "Verse_riwaya_page_idx" ON "Verse"("riwaya", "page");

-- CreateIndex
CREATE UNIQUE INDEX "Verse_riwaya_surah_verse_key" ON "Verse"("riwaya", "surah", "verse");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_userId_riwaya_surah_verse_key" ON "Bookmark"("userId", "riwaya", "surah", "verse");

-- CreateIndex
CREATE INDEX "Dhikr_categoryId_sortOrder_idx" ON "Dhikr"("categoryId", "sortOrder");

-- CreateIndex
CREATE INDEX "BookChapter_bookId_sortOrder_idx" ON "BookChapter"("bookId", "sortOrder");

-- CreateIndex
CREATE INDEX "BookEntry_chapterId_number_idx" ON "BookEntry"("chapterId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "DonationCause_slug_key" ON "DonationCause"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_operator_key" ON "PaymentMethod"("operator");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_code_key" ON "Donation"("code");

-- CreateIndex
CREATE INDEX "Donation_status_createdAt_idx" ON "Donation"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Donation_userId_createdAt_idx" ON "Donation"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Donation_causeId_status_idx" ON "Donation"("causeId", "status");

-- CreateIndex
CREATE INDEX "DonationEvent_donationId_createdAt_idx" ON "DonationEvent"("donationId", "createdAt");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingPosition" ADD CONSTRAINT "ReadingPosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dhikr" ADD CONSTRAINT "Dhikr_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DhikrCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookChapter" ADD CONSTRAINT "BookChapter_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookEntry" ADD CONSTRAINT "BookEntry_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "BookChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_causeId_fkey" FOREIGN KEY ("causeId") REFERENCES "DonationCause"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationEvent" ADD CONSTRAINT "DonationEvent_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "Donation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationEvent" ADD CONSTRAINT "DonationEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
