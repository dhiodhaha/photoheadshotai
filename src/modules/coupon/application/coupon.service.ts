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

	// All state checks (limit, expiry, duplicate) are re-validated atomically
	// inside redeemCouponAtomic — no pre-checks here to avoid TOCTOU.
	const { credits, newBalance } = await redeemCouponAtomic(coupon.id, userId);

	return { credits, newBalance };
}
