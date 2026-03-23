-- AlterTable: add referral fields to users
ALTER TABLE "users" ADD COLUMN "referral_code" TEXT NOT NULL DEFAULT gen_random_uuid()::text;
ALTER TABLE "users" ADD COLUMN "referred_by" TEXT;

-- CreateIndex: unique referral_code
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- CreateTable: bootstrap_codes
CREATE TABLE "bootstrap_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "max_redeems" INTEGER NOT NULL DEFAULT 5,
    "redeem_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bootstrap_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique code
CREATE UNIQUE INDEX "bootstrap_codes_code_key" ON "bootstrap_codes"("code");

-- CreateTable: bootstrap_redemptions
CREATE TABLE "bootstrap_redemptions" (
    "id" TEXT NOT NULL,
    "bootstrap_code_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "redeemed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bootstrap_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique user_id (one redemption per user)
CREATE UNIQUE INDEX "bootstrap_redemptions_user_id_key" ON "bootstrap_redemptions"("user_id");

-- CreateIndex
CREATE INDEX "bootstrap_redemptions_bootstrap_code_id_idx" ON "bootstrap_redemptions"("bootstrap_code_id");

-- AddForeignKey
ALTER TABLE "bootstrap_redemptions" ADD CONSTRAINT "bootstrap_redemptions_bootstrap_code_id_fkey"
    FOREIGN KEY ("bootstrap_code_id") REFERENCES "bootstrap_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: referral_rewards
CREATE TABLE "referral_rewards" (
    "id" TEXT NOT NULL,
    "referrer_id" TEXT NOT NULL,
    "new_user_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 10,
    "rewarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique new_user_id (one reward per new user)
CREATE UNIQUE INDEX "referral_rewards_new_user_id_key" ON "referral_rewards"("new_user_id");

-- CreateIndex
CREATE INDEX "referral_rewards_referrer_id_idx" ON "referral_rewards"("referrer_id");
