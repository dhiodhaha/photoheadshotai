export type TransactionType =
	| "purchase"
	| "generation_deduction"
	| "generation_refund"
	| "referral_reward"
	| "coupon_redemption";

export interface CreditTransaction {
	id: string;
	userId: string;
	amount: number;
	transactionType: TransactionType;
	createdAt: Date;
}
