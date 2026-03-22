import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "#/modules/auth";
import { generateSchema } from "#/modules/studio/application/generation.schema";
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
					const { image_id, style } = generateSchema.parse(body);

					const result = await generationService.startGeneration(
						session.user.id,
						image_id,
						style,
					);

					return Response.json(
						{
							message: "Generation started",
							job_id: result.job_id,
							cost_credits: result.cost_credits,
						},
						{ status: 202 },
					);
				} catch (error: unknown) {
					console.error("AI Generate Error:", error);
					const message =
						error instanceof Error ? error.message : "Internal server error";
					return Response.json({ error: message }, { status: 500 });
				}
			},
		},
	},
});
