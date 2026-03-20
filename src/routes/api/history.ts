import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "#/lib/prisma";
import { getServerSession } from "#/modules/auth";

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
				const skip = (page - 1) * limit;

				const [headshots, total] = await prisma.$transaction([
					prisma.generatedHeadshot.findMany({
						where: {
							isDeleted: false,
							generationJob: { userId: session.user.id },
						},
						include: { generationJob: true },
						orderBy: { createdAt: "desc" },
						skip,
						take: limit,
					}),
					prisma.generatedHeadshot.count({
						where: {
							isDeleted: false,
							generationJob: { userId: session.user.id },
						},
					}),
				]);

				const data = headshots.map((h) => ({
					id: h.id,
					src: h.resultUrl,
					style: h.generationJob.stylePrompt,
					createdAt: h.createdAt,
				}));

				return Response.json({
					headshots: data,
					pagination: {
						page,
						limit,
						total,
						totalPages: Math.ceil(total / limit),
					},
				});
			},
		},
	},
});
