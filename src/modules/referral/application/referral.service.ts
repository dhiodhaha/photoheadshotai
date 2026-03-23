import { REFERRAL_CREDIT_REWARD } from "../domain/referral.entity";
import {
	awardReferralCredits,
	findBootstrapCode,
	findUserByReferralCode,
	hasReferralReward,
	redeemBootstrapCode,
} from "../infrastructure/referral.repository";

export type CodeValidationResult =
	| { valid: true; type: "bootstrap"; bootstrapCodeId: string }
	| { valid: true; type: "referral"; referrerId: string }
	| { valid: false; reason: string };

export async function validateReferralCode(
	code: string,
): Promise<CodeValidationResult> {
	// Check bootstrap codes first
	const bootstrap = await findBootstrapCode(code);
	if (bootstrap) {
		if (bootstrap.redeemCount >= bootstrap.maxRedeems) {
			return {
				valid: false,
				reason: `This code has reached its limit (${bootstrap.maxRedeems} signups max)`,
			};
		}
		return { valid: true, type: "bootstrap", bootstrapCodeId: bootstrap.id };
	}

	// Check user referral codes
	const referrer = await findUserByReferralCode(code);
	if (referrer) {
		return { valid: true, type: "referral", referrerId: referrer.id };
	}

	return { valid: false, reason: "Invalid referral code" };
}

export async function processSignupCode(
	result: CodeValidationResult,
	newUserId: string,
) {
	if (!result.valid) return;

	if (result.type === "bootstrap") {
		await redeemBootstrapCode(result.bootstrapCodeId, newUserId);
	}
	// Referral reward is given on email verification, not here
}

export async function rewardReferrerOnVerification(
	referrerId: string,
	newUserId: string,
) {
	const existing = await hasReferralReward(newUserId);
	if (existing) return; // Prevent double rewards

	await awardReferralCredits(referrerId, newUserId, REFERRAL_CREDIT_REWARD);
}
