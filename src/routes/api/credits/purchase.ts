import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { prisma } from "#/lib/prisma";
import { getServerSession } from "#/modules/auth";

const purchaseSchema = z.object({
	planId: z.string(),
	credits: z.number().positive(),
	amount: z.number().positive(),
});

export const Route = createFileRoute("/api/credits/purchase")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await getServerSession(request);
				if (!session || !session.user) {
					return Response.json({ error: "Unauthorized" }, { status: 401 });
				}

				try {
					const body = await request.json();
					const { credits } = purchaseSchema.parse(body);

					// In a real app, we would verify the Stripe payment here.
					// For now, we simulate a successful transaction.

					const result = await prisma.$transaction([
						prisma.user.update({
							where: { id: session.user.id },
							data: { currentCredits: { increment: credits } },
						}),
						prisma.creditTransaction.create({
							data: {
								userId: session.user.id,
								amount: credits,
								transactionType: "PURCHASE",
							},
						}),
					]);

					return Response.json({
						message: `Successfully purchased ${credits} credits!`,
						newBalance: result[0].currentCredits,
					});
				} catch (_error) {
					return Response.json({ error: "Invalid request" }, { status: 400 });
				}
			},
		},
	},
});
