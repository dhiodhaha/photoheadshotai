import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "#/modules/auth";
import { purchaseCredits, purchaseSchema } from "#/modules/credits";

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
					const newBalance = await purchaseCredits(
						session.user.id,
						credits,
					);

					return Response.json({
						message: `Successfully purchased ${credits} credits!`,
						newBalance,
					});
				} catch (_error) {
					return Response.json(
						{ error: "Invalid request" },
						{ status: 400 },
					);
				}
			},
		},
	},
});
