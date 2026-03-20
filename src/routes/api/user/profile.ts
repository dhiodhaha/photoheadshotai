import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "#/lib/prisma";
import { getServerSession } from "#/modules/auth";

export const Route = createFileRoute("/api/user/profile")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await getServerSession(request);
				if (!session || !session.user) {
					return Response.json({ error: "Unauthorized" }, { status: 401 });
				}

				const user = await prisma.user.findUnique({
					where: { id: session.user.id },
					select: {
						id: true,
						email: true,
						name: true,
						image: true,
						currentCredits: true,
						createdAt: true,
					},
				});

				if (!user) {
					return Response.json({ error: "User not found" }, { status: 404 });
				}

				return Response.json({ user });
			},
		},
	},
});
