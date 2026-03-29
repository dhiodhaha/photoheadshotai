import { createFileRoute } from "@tanstack/react-router";
import { falWebhookSchema } from "#/modules/studio/application/webhook.schema";
import { processWebhookResult } from "#/modules/studio/application/webhook.service";

export const Route = createFileRoute("/api/studio/webhook/fal")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const url = new URL(request.url);
				const secret = url.searchParams.get("secret");
				const jobId = url.searchParams.get("jobId");
				const userId = url.searchParams.get("userId");
				const photoId = url.searchParams.get("photoId");

				if (secret !== process.env.WEBHOOK_SECRET) {
					return Response.json({ error: "Unauthorized" }, { status: 401 });
				}
				if (!jobId || !userId || !photoId) {
					return Response.json({ error: "Missing params" }, { status: 400 });
				}

				let body: unknown;
				try {
					body = await request.json();
				} catch {
					return Response.json({ error: "Invalid JSON" }, { status: 400 });
				}

				const parsed = falWebhookSchema.safeParse(body);
				if (!parsed.success) {
					console.error("Webhook payload parse error:", parsed.error.message);
					return Response.json({ error: "Invalid payload" }, { status: 400 });
				}

				try {
					await processWebhookResult({
						jobId,
						userId,
						photoId,
						payload: parsed.data,
					});
				} catch (error: unknown) {
					console.error(
						`Webhook processing failed for job ${jobId}:`,
						error instanceof Error ? error.message : String(error),
					);
					return Response.json({ error: "Processing failed" }, { status: 500 });
				}

				return Response.json({ ok: true });
			},
		},
	},
});
