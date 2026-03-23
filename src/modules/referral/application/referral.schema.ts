import { z } from "zod/v4";

export const referralCodeSchema = z.object({
	referralCode: z.string().min(1, "Referral code is required"),
});
