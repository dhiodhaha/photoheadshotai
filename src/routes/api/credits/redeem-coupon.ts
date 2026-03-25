import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "#/modules/auth";
import { redeemCoupon } from "#/modules/coupon";

export const Route = createFileRoute("/api/credits/redeem-coupon")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await getServerSession(request);
				if (!session || !session.user) {
					return Response.json({ error: "Unauthorized" }, { status: 401 });
				}

				try {
					const body = await request.json();
					const result = await redeemCoupon(session.user.id, body.code);
					return Response.json(result);
				} catch (error: unknown) {
					const message =
						error instanceof Error ? error.message : "Internal server error";
					return Response.json({ error: message }, { status: 400 });
				}
			},
		},
	},
});
