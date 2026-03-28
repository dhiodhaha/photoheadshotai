import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "#/modules/auth";
import { redeemCoupon, redeemCouponSchema } from "#/modules/coupon";

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
					const { code } = redeemCouponSchema.parse(body);
					const result = await redeemCoupon(session.user.id, code);
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
