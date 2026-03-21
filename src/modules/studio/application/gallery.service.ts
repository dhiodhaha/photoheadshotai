import { prisma } from "#/lib/prisma";

export async function getHeadshotGallery(userId: string) {
	const headshots = await prisma.generatedHeadshot.findMany({
		where: {
			resultUrl: { not: "" },
			isDeleted: false,
			generationJob: { userId },
		},
		include: { generationJob: true },
		orderBy: { createdAt: "desc" },
	});

	return headshots.map((h) => ({
		id: h.id,
		src: h.resultUrl,
		style: h.generationJob.stylePrompt,
		createdAt: h.createdAt,
	}));
}

export async function deleteHeadshot(headshotId: string, userId: string) {
	const headshot = await prisma.generatedHeadshot.findFirst({
		where: {
			id: headshotId,
			generationJob: { userId },
		},
	});

	if (!headshot) {
		throw new Error("Not found or unauthorized");
	}

	await prisma.generatedHeadshot.update({
		where: { id: headshotId },
		data: { isDeleted: true },
	});
}
