import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "#/modules/auth";
import {
	ALLOWED_CONTENT_TYPES,
	MAX_FILE_SIZE,
	uploadPhoto,
} from "#/modules/studio";

export const Route = createFileRoute("/api/studio/upload")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await getServerSession(request);
				if (!session) {
					return Response.json({ error: "Unauthorized" }, { status: 401 });
				}

				const formData = await request.formData();
				const file = formData.get("file");

				if (!(file instanceof File)) {
					return Response.json(
						{ error: "Missing file field in form data" },
						{ status: 400 },
					);
				}

				if (
					!ALLOWED_CONTENT_TYPES.includes(
						file.type as (typeof ALLOWED_CONTENT_TYPES)[number],
					)
				) {
					return Response.json(
						{ error: "Only JPEG, PNG, and WebP images are allowed" },
						{ status: 400 },
					);
				}

				if (file.size > MAX_FILE_SIZE) {
					return Response.json(
						{ error: "File must be under 10MB" },
						{ status: 400 },
					);
				}

				const result = await uploadPhoto(session.user.id, file);
				return Response.json(result, { status: 201 });
			},
		},
	},
});
