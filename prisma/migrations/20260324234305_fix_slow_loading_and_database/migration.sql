-- DropIndex
DROP INDEX "sessions_token_idx";

-- AlterTable
ALTER TABLE "generation_jobs" ADD COLUMN     "style_id" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "referral_code" DROP DEFAULT;
