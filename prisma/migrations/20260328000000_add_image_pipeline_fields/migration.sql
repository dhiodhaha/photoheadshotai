-- Add image pipeline fields to GeneratedHeadshot
ALTER TABLE "generated_headshots" ADD COLUMN "thumbnail_url" TEXT,
ADD COLUMN "r2_key" TEXT,
ADD COLUMN "r2_thumbnail_key" TEXT;
