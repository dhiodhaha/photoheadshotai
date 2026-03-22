-- Normalize legacy transaction_type values before creating enum
UPDATE "credit_transactions" SET "transaction_type" = 'purchase' WHERE "transaction_type" = 'Topup';
UPDATE "credit_transactions" SET "transaction_type" = 'purchase' WHERE "transaction_type" = 'PURCHASE';
UPDATE "credit_transactions" SET "transaction_type" = 'generation_deduction' WHERE "transaction_type" = 'GENERATION_DEDUCTION';
UPDATE "credit_transactions" SET "transaction_type" = 'generation_refund' WHERE "transaction_type" = 'GENERATION_REFUND';

-- Normalize legacy status values in photos
UPDATE "photos" SET "status" = 'pending' WHERE "status" = 'PENDING';
UPDATE "photos" SET "status" = 'uploaded' WHERE "status" = 'UPLOADED';
UPDATE "photos" SET "status" = 'processing' WHERE "status" = 'PROCESSING';
UPDATE "photos" SET "status" = 'completed' WHERE "status" = 'COMPLETED';
UPDATE "photos" SET "status" = 'failed' WHERE "status" = 'FAILED';

-- Normalize legacy status values in generation_jobs
UPDATE "generation_jobs" SET "status" = 'pending' WHERE "status" = 'PENDING';
UPDATE "generation_jobs" SET "status" = 'processing' WHERE "status" = 'PROCESSING';
UPDATE "generation_jobs" SET "status" = 'completed' WHERE "status" = 'COMPLETED';
UPDATE "generation_jobs" SET "status" = 'failed' WHERE "status" = 'FAILED';

-- Create enums
CREATE TYPE "PhotoStatus" AS ENUM ('pending', 'uploaded', 'processing', 'completed', 'failed');
CREATE TYPE "GenerationJobStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE "TransactionType" AS ENUM ('purchase', 'generation_deduction', 'generation_refund');

-- Alter photos.status: drop default, cast to enum, restore default
ALTER TABLE "photos" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "photos"
  ALTER COLUMN "status" TYPE "PhotoStatus"
  USING "status"::"PhotoStatus";
ALTER TABLE "photos" ALTER COLUMN "status" SET DEFAULT 'pending'::"PhotoStatus";

-- Alter generation_jobs.status: drop default, cast to enum, restore default
ALTER TABLE "generation_jobs" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "generation_jobs"
  ALTER COLUMN "status" TYPE "GenerationJobStatus"
  USING "status"::"GenerationJobStatus";
ALTER TABLE "generation_jobs" ALTER COLUMN "status" SET DEFAULT 'pending'::"GenerationJobStatus";

-- Alter credit_transactions.transaction_type: TEXT -> TransactionType enum
ALTER TABLE "credit_transactions"
  ALTER COLUMN "transaction_type" TYPE "TransactionType"
  USING "transaction_type"::"TransactionType";
