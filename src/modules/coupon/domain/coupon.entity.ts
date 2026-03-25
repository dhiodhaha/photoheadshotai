export interface Coupon {
	id: string;
	code: string;
	credits: number;
	maxRedeems: number;
	redeemCount: number;
	expiresAt: Date | null;
	createdAt: Date;
}

export interface CouponRedemption {
	id: string;
	couponId: string;
	userId: string;
	redeemedAt: Date;
}
