export { referralCodeSchema } from "./application/referral.schema";
export type { CodeValidationResult } from "./application/referral.service";
export {
	processSignupCode,
	rewardReferrerOnVerification,
	validateReferralCode,
} from "./application/referral.service";
export type { BootstrapCode, ReferralReward } from "./domain/referral.entity";
export { REFERRAL_CREDIT_REWARD } from "./domain/referral.entity";
