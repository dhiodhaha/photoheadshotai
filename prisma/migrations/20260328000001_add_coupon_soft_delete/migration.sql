-- Add soft delete to coupons
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN NOT NULL DEFAULT false;
