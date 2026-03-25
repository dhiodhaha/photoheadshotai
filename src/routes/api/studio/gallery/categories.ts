import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "#/modules/auth";
import { getGalleryCategories } from "#/modules/studio/application/gallery.service";

export const Route = createFileRoute("/api/studio/gallery/categories")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await getServerSession(request);
				if (!session || !session.user) {
					return Response.json({ error: "Unauthorized" }, { status: 401 });
				}

				const categories = await getGalleryCategories(session.user.id);
				return Response.json({ categories });
			},
		},
	},
});
