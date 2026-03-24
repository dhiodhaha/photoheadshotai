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
		const user = await tx.user.findUnique({
			where: { id: userId },
			select: { currentCredits: true },
		});
		if (!user || user.currentCredits < amount) {
			throw new Error("Insufficient credits");
		}
		const [updated] = await Promise.all([
			tx.user.update({
				where: { id: userId },
				data: { currentCredits: { decrement: amount } },
			}),
			tx.creditTransaction.create({
				data: { userId, amount: -amount, transactionType },
			}),
		]);
		return updated.currentCredits;
	});
}
