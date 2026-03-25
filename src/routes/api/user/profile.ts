import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "#/modules/auth";
import {
	getUserProfile,
	updateUserProfile,
} from "#/modules/auth/application/profile.service";

export const Route = createFileRoute("/api/user/profile")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await getServerSession(request);
				if (!session || !session.user) {
					return Response.json({ error: "Unauthorized" }, { status: 401 });
				}

				const user = await getUserProfile(session.user.id);

				if (!user) {
					return Response.json({ error: "User not found" }, { status: 404 });
				}

				return Response.json({ user });
			},
			PUT: async ({ request }) => {
				const session = await getServerSession(request);
				if (!session || !session.user) {
					return Response.json({ error: "Unauthorized" }, { status: 401 });
				}

				try {
					const body = await request.json();
					const user = await updateUserProfile(session.user.id, {
						name: body.name,
					});
					return Response.json({ user });
				} catch (error: unknown) {
					const message =
						error instanceof Error ? error.message : "Internal server error";
					return Response.json({ error: message }, { status: 400 });
				}
			},
		},
	},
});
