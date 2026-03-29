import { randomUUID } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "#/modules/auth";
import {
	ALLOWED_CONTENT_TYPES,
	MAX_FILE_SIZE,
} from "#/modules/studio/application/upload.schema";
import {
	getPresignedPutUrl,
	getR2Client,
} from "#/modules/studio/infrastructure/r2.server";

export const Route = createFileRoute("/api/studio/upload-url")({
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

				const { contentType, size, filename } = body as {
					contentType: string;
					size: number;
					filename: string;
				};

				if (
					!ALLOWED_CONTENT_TYPES.includes(
						contentType as (typeof ALLOWED_CONTENT_TYPES)[number],
					)
				) {
					return Response.json(
						{ error: "Only JPEG, PNG, and WebP images are allowed" },
						{ status: 400 },
					);
				}

				if (!size || size > MAX_FILE_SIZE) {
					return Response.json(
						{ error: "File must be under 10MB" },
						{ status: 400 },
					);
				}

				if (!getR2Client()) {
					// Mock mode — return a fake URL
					const key = `photos/${session.user.id}/${randomUUID()}.jpg`;
					return Response.json({
						presignedUrl: null,
						key,
						filename: filename || "mock.jpg",
					});
				}

				const ext = (filename || "photo.jpg").split(".").pop() ?? "jpg";
				const key = `photos/${session.user.id}/${randomUUID()}.${ext}`;
				const presignedUrl = await getPresignedPutUrl(key, contentType);

				return Response.json({ presignedUrl, key, filename });
			},
		},
	},
});
