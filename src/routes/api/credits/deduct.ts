import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { prisma } from "#/lib/prisma";
import { getServerSession } from "#/modules/auth";

const deductSchema = z.object({
	amount: z.number().positive(),
	reason: z.string().optional(),
});

export const Route = createFileRoute("/api/credits/deduct")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await getServerSession(request);
				if (!session || !session.user) {
					return Response.json({ error: "Unauthorized" }, { status: 401 });
				}

				try {
					const body = await request.json();
					const { amount, reason } = deductSchema.parse(body);

					const user = await prisma.user.findUnique({
						where: { id: session.user.id },
					});

					if (!user || user.currentCredits < amount) {
						return Response.json(
							{ error: "Insufficient credits" },
							{ status: 402 },
						);
					}

					// Atomically deduct and log
					await prisma.$transaction([
						prisma.user.update({
							where: { id: user.id },
							data: { currentCredits: { decrement: amount } },
						}),
						prisma.creditTransaction.create({
							data: {
								userId: user.id,
								amount: -amount,
								transactionType: "GENERATION_DEDUCTION", // Using this for simplicity, or could add 'MANUAL_DEDUCTION'
								// description: reason || "Manual deduction" // If we added description to schema
							},
						}),
					]);

					return Response.json({
						message: "Credits deducted successfully",
						remainingCredits: user.currentCredits - amount,
					});
				} catch (error: any) {
					return Response.json(
						{ error: error.message || "Internal server error" },
						{ status: 500 },
					);
				}
			},
		},
	},
});
