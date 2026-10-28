-- CreateEnum
CREATE TYPE "CauseStatus" AS ENUM ('upcoming', 'ongoing', 'completed');

-- AlterTable
ALTER TABLE "DonationCause" ADD COLUMN     "collectedAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "eventDate" DATE,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "status" "CauseStatus" NOT NULL DEFAULT 'ongoing';
