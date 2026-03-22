import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "#/modules/auth";
import { getGenerationHistory } from "#/modules/studio/application/history.service";

export const Route = createFileRoute("/api/history")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await getServerSession(request);
				if (!session || !session.user) {
					return Response.json({ error: "Unauthorized" }, { status: 401 });
				}

				const url = new URL(request.url);
				const page = parseInt(url.searchParams.get("page") || "1", 10);
				const limit = parseInt(url.searchParams.get("limit") || "10", 10);

				const result = await getGenerationHistory({
					userId: session.user.id,
					page,
					limit,
				});

				return Response.json(result);
			},
		},
	},
});
