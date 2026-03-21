import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "#/modules/auth";
import { deductSchema, deductUserCredits } from "#/modules/credits";

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
					const { amount } = deductSchema.parse(body);

					const remainingCredits = await deductUserCredits(
						session.user.id,
						amount,
					);

					return Response.json({
						message: "Credits deducted successfully",
						remainingCredits,
					});
				} catch (error: unknown) {
					const message =
						error instanceof Error ? error.message : "Internal server error";

					if (message === "Insufficient credits") {
						return Response.json({ error: message }, { status: 402 });
					}

					return Response.json({ error: message }, { status: 500 });
				}
			},
		},
	},
});
