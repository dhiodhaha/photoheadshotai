import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "#/modules/auth";
import {
	deleteHeadshot,
	getHeadshotGallery,
} from "#/modules/studio/application/gallery.service";

export const Route = createFileRoute("/api/studio/gallery")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await getServerSession(request);
				if (!session || !session.user) {
					return Response.json({ error: "Unauthorized" }, { status: 401 });
				}

				const headshots = await getHeadshotGallery(session.user.id);
				return Response.json({ headshots });
			},
			POST: async ({ request }) => {
				const session = await getServerSession(request);
				if (!session || !session.user) {
					return Response.json({ error: "Unauthorized" }, { status: 401 });
				}

				try {
					const { id } = await request.json();
					if (!id) {
						return Response.json(
							{ error: "Missing ID" },
							{ status: 400 },
						);
					}

					await deleteHeadshot(id, session.user.id);
					return Response.json({ message: "Deleted successfully (Soft)" });
				} catch (error: unknown) {
					const message =
						error instanceof Error
							? error.message
							: "Internal server error";
					return Response.json({ error: message }, { status: 404 });
				}
			},
		},
	},
});
