import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "#/modules/auth";
import { generationService } from "#/modules/studio/application/generation.service";

export const Route = createFileRoute("/api/studio/generate")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await getServerSession(request);
				if (!session || !session.user) {
					return Response.json({ error: "Unauthorized" }, { status: 401 });
				}

				try {
					const body = await request.json();
					const { image_id, style } = body;

					if (!image_id || !style) {
						return Response.json(
							{ error: "Missing image_id or style" },
							{ status: 400 },
						);
					}

					const result = await generationService.startGeneration(
						session.user.id,
						image_id,
						style,
					);

					return Response.json(
						{
							message: "Generation started successfully",
							job_id: result.job_id,
							image_url: result.image_url,
						},
						{ status: 200 },
					);
				} catch (error: any) {
					console.error("AI Generate Error:", error);
					return Response.json(
						{ error: error.message || "Internal server error" },
						{ status: 500 },
					);
				}
			},
		},
	},
});
