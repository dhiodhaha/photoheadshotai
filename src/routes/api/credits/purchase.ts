import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "#/modules/auth";

export const Route = createFileRoute("/api/credits/purchase")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await getServerSession(request);
				if (!session || !session.user) {
					return Response.json({ error: "Unauthorized" }, { status: 401 });
				}

				// The billing feature is currently disabled (coming soon).
				// This closes the backdoor that allowed unverified credit minting.
				return Response.json(
					{ error: "Billing is not enabled at the moment. Coming Soon!" },
					{ status: 403 },
				);
			},
		},
	},
});
