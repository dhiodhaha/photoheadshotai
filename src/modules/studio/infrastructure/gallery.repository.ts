import { GenerationJobStatus } from "#/generated/prisma/enums";
import { prisma } from "#/lib/prisma";

export async function findActiveJobsByUser(userId: string) {
	return prisma.generationJob.findMany({
		where: {
			userId,
			status: {
				in: [GenerationJobStatus.pending, GenerationJobStatus.processing],
			},
		},
		select: { id: true },
		orderBy: { startedAt: "desc" },
	});
}

export async function findHeadshotsByUser(userId: string, styleId?: string) {
	return prisma.generatedHeadshot.findMany({
		where: {
			resultUrl: { not: "" },
			isDeleted: false,
			generationJob: styleId ? { userId, styleId } : { userId },
		},
		include: {
			generationJob: true,
			favorites: { where: { userId }, select: { id: true } },
		},
		orderBy: { createdAt: "desc" },
	});
}

export async function findDistinctStylesByUser(userId: string) {
	return prisma.generationJob.findMany({
		where: {
			userId,
			generatedHeadshots: {
				some: { isDeleted: false, resultUrl: { not: "" } },
			},
		},
		select: { styleId: true },
		distinct: ["styleId"],
	});
}

export async function findHeadshotOwned(headshotId: string, userId: string) {
	return prisma.generatedHeadshot.findFirst({
		where: { id: headshotId, generationJob: { userId } },
	});
}

export async function softDeleteHeadshot(headshotId: string) {
	return prisma.generatedHeadshot.update({
		where: { id: headshotId },
		data: { isDeleted: true },
	});
}

export async function findFavoritesByUser(userId: string) {
	return prisma.favoriteHeadshot.findMany({
		where: { userId },
		include: {
			headshot: { include: { generationJob: true } },
		},
		orderBy: { createdAt: "desc" },
	});
}

export async function findFavorite(userId: string, headshotId: string) {
	return prisma.favoriteHeadshot.findUnique({
		where: { userId_headshotId: { userId, headshotId } },
	});
}

export async function deleteFavorite(userId: string, headshotId: string) {
	return prisma.favoriteHeadshot.delete({
		where: { userId_headshotId: { userId, headshotId } },
	});
}

export async function createFavorite(userId: string, headshotId: string) {
	return prisma.favoriteHeadshot.create({ data: { userId, headshotId } });
}

export async function toggleFavoriteAtomic(
	userId: string,
	headshotId: string,
): Promise<{ favorited: boolean }> {
	return prisma.$transaction(async (tx) => {
		const headshot = await tx.generatedHeadshot.findFirst({
			where: { id: headshotId, generationJob: { userId } },
			select: { id: true },
		});

		if (!headshot) {
			throw new Error("Not found or unauthorized");
		}

		const existing = await tx.favoriteHeadshot.findUnique({
			where: { userId_headshotId: { userId, headshotId } },
		});

		if (existing) {
			await tx.favoriteHeadshot.delete({
				where: { userId_headshotId: { userId, headshotId } },
			});
			return { favorited: false };
		}

		await tx.favoriteHeadshot.create({ data: { userId, headshotId } });
		return { favorited: true };
	});
}

export async function findDeletedHeadshotsByUser(userId: string) {
	return prisma.generatedHeadshot.findMany({
		where: { isDeleted: true, generationJob: { userId } },
		include: { generationJob: true },
		orderBy: { createdAt: "desc" },
	});
}

export async function findDeletedHeadshotOwned(
	headshotId: string,
	userId: string,
) {
	return prisma.generatedHeadshot.findFirst({
		where: { id: headshotId, isDeleted: true, generationJob: { userId } },
	});
}

export async function restoreHeadshotById(headshotId: string) {
	return prisma.generatedHeadshot.update({
		where: { id: headshotId },
		data: { isDeleted: false },
	});
}

export async function hardDeleteHeadshot(headshotId: string) {
	return prisma.generatedHeadshot.delete({ where: { id: headshotId } });
}
