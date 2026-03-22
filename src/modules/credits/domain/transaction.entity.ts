export type TransactionType =
	| "purchase"
	| "generation_deduction"
	| "generation_refund";

export interface CreditTransaction {
	id: string;
	userId: string;
	amount: number;
	transactionType: TransactionType;
	createdAt: Date;
}
