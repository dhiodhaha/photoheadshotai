import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "#/lib/prisma";
import { getServerSession } from "#/modules/auth";

export const Route = createFileRoute("/api/studio/gallery")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				// 1. Authenticate user
				const session = await getServerSession(request);
				if (!session || !session.user) {
					return Response.json({ error: "Unauthorized" }, { status: 401 });
				}

				const user = session.user;

				// 2. Fetch all completed generations for this user
				const headshots = await prisma.generatedHeadshot.findMany({
					where: {
						resultUrl: { not: "" }, // Only show valid URLs
						isDeleted: false, // Only non-deleted
						generationJob: {
							userId: user.id,
						},
					},
					include: {
						generationJob: true,
					},
					orderBy: {
						createdAt: "desc",
					},
				});

				// 3. Transform to matching frontend format
				const data = headshots.map((h) => ({
					id: h.id,
					src: h.resultUrl,
					style: h.generationJob.stylePrompt,
					createdAt: h.createdAt,
				}));

				return Response.json({ headshots: data });
			},
			POST: async ({ request }) => {
				// Authenticate user
				const session = await getServerSession(request);
				if (!session || !session.user) {
					return Response.json({ error: "Unauthorized" }, { status: 401 });
				}

				const { id } = await request.json();
				if (!id) return Response.json({ error: "Missing ID" }, { status: 400 });

				// Ensure user owns this headshot before deleting
				const headshot = await prisma.generatedHeadshot.findFirst({
					where: {
						id,
						generationJob: { userId: session.user.id },
					},
				});

				if (!headshot) {
					return Response.json(
						{ error: "Not found or unauthorized" },
						{ status: 404 },
					);
				}

				await prisma.generatedHeadshot.update({
					where: { id },
					data: { isDeleted: true },
				});

				return Response.json({ message: "Deleted successfully (Soft)" });
			},
		},
	},
});
