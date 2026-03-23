import { prisma } from "#/lib/prisma";

export async function findBootstrapCode(code: string) {
	return prisma.bootstrapCode.findUnique({
		where: { code },
		include: { redemptions: true },
	});
}

export async function redeemBootstrapCode(codeId: string, userId: string) {
	return prisma.$transaction([
		prisma.bootstrapCode.update({
			where: { id: codeId },
			data: { redeemCount: { increment: 1 } },
		}),
		prisma.bootstrapRedemption.create({
			data: { bootstrapCodeId: codeId, userId },
		}),
	]);
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
	amount: number,
) {
	return prisma.$transaction([
		prisma.user.update({
			where: { id: referrerId },
			data: { currentCredits: { increment: amount } },
		}),
		prisma.creditTransaction.create({
			data: {
				userId: referrerId,
				amount,
				transactionType: "purchase",
			},
		}),
		prisma.referralReward.create({
			data: { referrerId, newUserId, amount },
		}),
	]);
}

export async function hasReferralReward(newUserId: string) {
	return prisma.referralReward.findUnique({ where: { newUserId } });
}
