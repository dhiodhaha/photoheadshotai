import { z } from "zod";

export const falWebhookSchema = z.object({
	status: z.enum(["OK", "ERROR"]),
	error: z.string().optional(),
	payload: z
		.object({
			images: z.array(z.object({ url: z.string().url() })).optional(),
		})
		.optional(),
});

export type FalWebhookPayload = z.infer<typeof falWebhookSchema>;
