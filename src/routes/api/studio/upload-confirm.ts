import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "#/modules/auth";
import { confirmUpload } from "#/modules/studio/application/upload.service";

export const Route = createFileRoute("/api/studio/upload-confirm")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await getServerSession(request);
				if (!session) {
					return Response.json({ error: "Unauthorized" }, { status: 401 });
				}

				let body: unknown;
				try {
					body = await request.json();
				} catch {
					return Response.json({ error: "Invalid JSON" }, { status: 400 });
				}

				const { key, filename, contentType, size } = body as {
					key: string;
					filename: string;
					contentType: string;
					size: number;
				};

				if (!key || !filename || !contentType || !size) {
					return Response.json(
						{ error: "Missing required fields" },
						{ status: 400 },
					);
				}

				// Verify the key belongs to this user
				if (!key.startsWith(`photos/${session.user.id}/`)) {
					return Response.json({ error: "Invalid key" }, { status: 403 });
				}

				try {
					const result = await confirmUpload(session.user.id, {
						key,
						filename,
						contentType,
						size,
					});
					return Response.json(result, { status: 201 });
				} catch (error: unknown) {
					const message =
						error instanceof Error
							? error.message
							: "Upload confirmation failed";
					return Response.json({ error: message }, { status: 400 });
				}
			},
		},
	},
});
