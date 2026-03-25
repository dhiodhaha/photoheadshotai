import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "#/modules/auth";
import { permanentlyDeleteHeadshot } from "#/modules/studio/application/trash.service";

export const Route = createFileRoute("/api/studio/trash/$id")({
	server: {
		handlers: {
			DELETE: async ({ request, params }) => {
				const session = await getServerSession(request);
				if (!session || !session.user) {
					return Response.json({ error: "Unauthorized" }, { status: 401 });
				}

				try {
					await permanentlyDeleteHeadshot(params.id, session.user.id);
					return Response.json({ message: "Permanently deleted" });
				} catch (error: unknown) {
					const message =
						error instanceof Error ? error.message : "Internal server error";
					return Response.json({ error: message }, { status: 404 });
				}
			},
		},
	},
});
