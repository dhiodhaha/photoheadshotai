import { z } from "zod";

export const redeemCouponSchema = z.object({
	code: z.string().trim().min(1, "Coupon code is required"),
});

export type RedeemCouponInput = z.infer<typeof redeemCouponSchema>;
