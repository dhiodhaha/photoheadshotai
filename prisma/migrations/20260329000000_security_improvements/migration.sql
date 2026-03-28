-- Add compound index on accounts(provider_id, account_id) for OAuth lookup performance
CREATE INDEX IF NOT EXISTS "accounts_provider_id_account_id_idx" ON "accounts"("provider_id", "account_id");
