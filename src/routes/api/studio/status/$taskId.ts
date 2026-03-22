import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "#/modules/auth";
import { generationService } from "#/modules/studio/application/generation.service";

export const Route = createFileRoute("/api/studio/status/$taskId")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const session = await getServerSession(request);
				if (!session || !session.user) {
					return Response.json({ error: "Unauthorized" }, { status: 401 });
				}

				try {
					const { taskId } = params;
					if (!taskId) {
						return Response.json({ error: "Missing taskId" }, { status: 400 });
					}

					const status = await generationService.getJobStatus(
						taskId,
						session.user.id,
					);
					return Response.json(status);
				} catch (error: unknown) {
					const message =
						error instanceof Error ? error.message : "Internal server error";
					return Response.json({ error: message }, { status: 500 });
				}
			},
		},
	},
});
