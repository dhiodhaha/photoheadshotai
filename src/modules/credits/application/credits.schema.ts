import { z } from "zod";

export const purchaseSchema = z.object({
	planId: z.string(),
	credits: z.number().positive(),
	amount: z.number().positive(),
});

export const deductSchema = z.object({
	amount: z.number().positive(),
	reason: z.string().optional(),
});

export type PurchaseInput = z.infer<typeof purchaseSchema>;
export type DeductInput = z.infer<typeof deductSchema>;
