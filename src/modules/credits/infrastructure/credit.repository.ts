import { prisma } from "#/lib/prisma";
import type { TransactionType } from "../domain/transaction.entity";

export async function getUserCredits(userId: string) {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { currentCredits: true },
	});
	return user?.currentCredits ?? 0;
}

export async function addCredits(
	userId: string,
	amount: number,
	transactionType: TransactionType,
) {
	const [user] = await prisma.$transaction([
		prisma.user.update({
			where: { id: userId },
			data: { currentCredits: { increment: amount } },
		}),
		prisma.creditTransaction.create({
			data: { userId, amount, transactionType },
		}),
	]);
	return user.currentCredits;
}

export async function deductCredits(
	userId: string,
	amount: number,
	transactionType: TransactionType,
) {
	// Atomic check-and-deduct inside a single transaction to prevent TOCTOU:
	// without this, two concurrent requests can both pass the balance check
	// and together deduct more than the user has.
	return prisma.$transaction(async (tx) => {
		// Single atomic UPDATE — only succeeds if balance >= amount.
		// Prevents TOCTOU: two concurrent reads at READ COMMITTED can both
		// pass a separate check, but only one UPDATE can win the row lock.
		const result = await tx.$queryRaw<{ current_credits: number }[]>`
			UPDATE users
			SET current_credits = current_credits - ${amount}
			WHERE id = ${userId} AND current_credits >= ${amount}
			RETURNING current_credits
		`;

		if (result.length === 0) {
			throw new Error("Insufficient credits");
		}

		await tx.creditTransaction.create({
			data: { userId, amount: -amount, transactionType },
		});

		return result[0].current_credits;
	});
}
