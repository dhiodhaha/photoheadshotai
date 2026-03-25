import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "#/modules/auth";
import { restoreHeadshot } from "#/modules/studio/application/trash.service";

export const Route = createFileRoute("/api/studio/trash/restore")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await getServerSession(request);
				if (!session || !session.user) {
					return Response.json({ error: "Unauthorized" }, { status: 401 });
				}

				try {
					const { headshotId } = await request.json();
					if (!headshotId) {
						return Response.json(
							{ error: "Missing headshotId" },
							{ status: 400 },
						);
					}

					await restoreHeadshot(headshotId, session.user.id);
					return Response.json({ message: "Restored successfully" });
				} catch (error: unknown) {
					const message =
						error instanceof Error ? error.message : "Internal server error";
					return Response.json({ error: message }, { status: 404 });
				}
			},
		},
	},
});
