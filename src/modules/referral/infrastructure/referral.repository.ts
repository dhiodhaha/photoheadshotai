import { TransactionType } from "#/generated/prisma/enums.js";
import { prisma } from "#/lib/prisma";

export async function findBootstrapCode(code: string) {
	return prisma.bootstrapCode.findUnique({
		where: { code },
		include: { redemptions: true },
	});
}

export async function redeemBootstrapCode(codeId: string, userId: string) {
	// Atomic: only increments redeemCount if still under maxRedeems,
	// preventing concurrent requests from exceeding the redemption limit.
	return prisma.$transaction(async (tx) => {
		const bootstrapCode = await tx.bootstrapCode.findUnique({
			where: { id: codeId },
			select: { redeemCount: true, maxRedeems: true },
		});
		if (
			!bootstrapCode ||
			bootstrapCode.redeemCount >= bootstrapCode.maxRedeems
		) {
			throw new Error("Bootstrap code has reached its redemption limit");
		}
		return Promise.all([
			tx.bootstrapCode.update({
				where: { id: codeId },
				data: { redeemCount: { increment: 1 } },
			}),
			tx.bootstrapRedemption.create({
				data: { bootstrapCodeId: codeId, userId },
			}),
		]);
	});
}

export async function findUserByReferralCode(referralCode: string) {
	return prisma.user.findUnique({
		where: { referralCode },
		select: { id: true, referralCode: true },
	});
}

export async function awardReferralCredits(
	referrerId: string,
	newUserId: string,
	referrerAmount: number,
	newUserAmount: number,
) {
	return prisma.$transaction([
		prisma.user.update({
			where: { id: referrerId },
			data: { currentCredits: { increment: referrerAmount } },
		}),
		prisma.creditTransaction.create({
			data: {
				userId: referrerId,
				amount: referrerAmount,
				transactionType: TransactionType.referral_reward,
			},
		}),
		prisma.user.update({
			where: { id: newUserId },
			data: { currentCredits: { increment: newUserAmount } },
		}),
		prisma.creditTransaction.create({
			data: {
				userId: newUserId,
				amount: newUserAmount,
				transactionType: TransactionType.referral_reward,
			},
		}),
		prisma.referralReward.create({
			data: { referrerId, newUserId, amount: referrerAmount },
		}),
	]);
}

export async function hasReferralReward(newUserId: string) {
	return prisma.referralReward.findUnique({ where: { newUserId } });
}
