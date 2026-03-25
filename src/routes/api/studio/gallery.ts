import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "#/modules/auth";
import {
	deleteHeadshot,
	getHeadshotGallery,
	toggleFavorite,
} from "#/modules/studio/application/gallery.service";

export const Route = createFileRoute("/api/studio/gallery")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await getServerSession(request);
				if (!session || !session.user) {
					return Response.json({ error: "Unauthorized" }, { status: 401 });
				}

				const url = new URL(request.url);
				const styleId = url.searchParams.get("style") ?? undefined;

				const headshots = await getHeadshotGallery(session.user.id, styleId);
				return Response.json({ headshots });
			},
			POST: async ({ request }) => {
				const session = await getServerSession(request);
				if (!session || !session.user) {
					return Response.json({ error: "Unauthorized" }, { status: 401 });
				}

				try {
					const body = await request.json();

					// Handle favorite toggle
					if (body.action === "favorite" && body.headshotId) {
						const result = await toggleFavorite(
							session.user.id,
							body.headshotId,
						);
						return Response.json(result);
					}

					// Handle soft delete (legacy: body.id)
					const id = body.id || body.headshotId;
					if (!id) {
						return Response.json({ error: "Missing ID" }, { status: 400 });
					}

					await deleteHeadshot(id, session.user.id);
					return Response.json({ message: "Deleted successfully (Soft)" });
				} catch (error: unknown) {
					const message =
						error instanceof Error ? error.message : "Internal server error";
					return Response.json({ error: message }, { status: 404 });
				}
			},
		},
	},
});
