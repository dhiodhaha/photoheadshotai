import {
	findCouponByCode,
	redeemCouponAtomic,
} from "../infrastructure/coupon.repository";
import { redeemCouponSchema } from "./coupon.schema";

export async function redeemCoupon(userId: string, code: string) {
	const parsed = redeemCouponSchema.parse({ code });

	const coupon = await findCouponByCode(parsed.code);

	if (!coupon) {
		throw new Error("Invalid coupon code");
	}

	if (coupon.redeemCount >= coupon.maxRedeems) {
		throw new Error("Coupon has reached its redemption limit");
	}

	if (coupon.expiresAt && coupon.expiresAt < new Date()) {
		throw new Error("Coupon has expired");
	}

	const newBalance = await redeemCouponAtomic(
		coupon.id,
		userId,
		coupon.credits,
	);

	return {
		credits: coupon.credits,
		newBalance,
	};
}
