import {
	addCredits,
	deductCredits,
	getUserCredits,
} from "../infrastructure/credit.repository";

export async function purchaseCredits(userId: string, amount: number) {
	return addCredits(userId, amount, "purchase");
}

export async function deductUserCredits(userId: string, amount: number) {
	const currentCredits = await getUserCredits(userId);
	if (currentCredits < amount) {
		throw new Error("Insufficient credits");
	}
	return deductCredits(userId, amount, "generation_deduction");
}

export async function refundCredits(userId: string, amount: number) {
	return addCredits(userId, amount, "generation_refund");
}

export async function hasEnoughCredits(userId: string, amount: number) {
	const currentCredits = await getUserCredits(userId);
	return currentCredits >= amount;
}
