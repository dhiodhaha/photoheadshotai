import { TransactionType } from "#/generated/prisma/enums.js";
import { prisma } from "#/lib/prisma";

export async function findCouponByCode(code: string) {
	return prisma.coupon.findUnique({
		where: { code },
	});
}

export async function redeemCouponAtomic(
	couponId: string,
	userId: string,
	credits: number,
) {
	return prisma.$transaction(async (tx) => {
		// Re-check coupon inside transaction to prevent TOCTOU
		const coupon = await tx.coupon.findUnique({
			where: { id: couponId },
			select: { redeemCount: true, maxRedeems: true, expiresAt: true },
		});

		if (!coupon) {
			throw new Error("Coupon not found");
		}

		if (coupon.redeemCount >= coupon.maxRedeems) {
			throw new Error("Coupon has reached its redemption limit");
		}

		if (coupon.expiresAt && coupon.expiresAt < new Date()) {
			throw new Error("Coupon has expired");
		}

		const existing = await tx.couponRedemption.findUnique({
			where: { couponId_userId: { couponId, userId } },
		});

		if (existing) {
			throw new Error("You have already redeemed this coupon");
		}

		const [updatedUser] = await Promise.all([
			tx.user.update({
				where: { id: userId },
				data: { currentCredits: { increment: credits } },
			}),
			tx.creditTransaction.create({
				data: {
					userId,
					amount: credits,
					transactionType: TransactionType.coupon_redemption,
				},
			}),
			tx.coupon.update({
				where: { id: couponId },
				data: { redeemCount: { increment: 1 } },
			}),
			tx.couponRedemption.create({
				data: { couponId, userId },
			}),
		]);

		return updatedUser.currentCredits;
	});
}
