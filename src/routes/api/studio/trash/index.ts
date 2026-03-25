import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "#/modules/auth";
import { getTrash } from "#/modules/studio/application/gallery.service";

export const Route = createFileRoute("/api/studio/trash/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await getServerSession(request);
				if (!session || !session.user) {
					return Response.json({ error: "Unauthorized" }, { status: 401 });
				}

				const headshots = await getTrash(session.user.id);
				return Response.json({ headshots });
			},
		},
	},
});
