export type BootstrapCode = {
	id: string;
	code: string;
	maxRedeems: number;
	redeemCount: number;
	createdAt: Date;
};

export type ReferralReward = {
	id: string;
	referrerId: string;
	newUserId: string;
	amount: number;
	rewardedAt: Date;
};

export const REFERRAL_CREDIT_REWARD = 10;
export const REFERRAL_NEW_USER_CREDIT_REWARD = 10;
