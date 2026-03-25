import { requireEnv } from "#/lib/env";
import { prisma } from "#/lib/prisma";
import { deleteFromR2 } from "../infrastructure/photo.storage";

export async function getHeadshotGallery(userId: string, styleId?: string) {
	const headshots = await prisma.generatedHeadshot.findMany({
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

	return headshots.map((h) => ({
		id: h.id,
		src: h.resultUrl,
		style: h.generationJob.styleId,
		styleLabel: h.generationJob.stylePrompt,
		createdAt: h.createdAt,
		isFavorited: h.favorites.length > 0,
	}));
}

export async function getGalleryCategories(userId: string) {
	const jobs = await prisma.generationJob.findMany({
		where: {
			userId,
			generatedHeadshots: {
				some: { isDeleted: false, resultUrl: { not: "" } },
			},
		},
		select: { styleId: true, stylePrompt: true },
		distinct: ["styleId"],
	});

	return jobs.map((j) => ({ styleId: j.styleId, label: j.stylePrompt }));
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

export async function toggleFavorite(userId: string, headshotId: string) {
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

export async function getFavorites(userId: string) {
	const favorites = await prisma.favoriteHeadshot.findMany({
		where: { userId },
		include: {
			headshot: { include: { generationJob: true } },
		},
		orderBy: { createdAt: "desc" },
	});

	return favorites.map((f) => ({
		id: f.headshot.id,
		src: f.headshot.resultUrl,
		style: f.headshot.generationJob.styleId,
		styleLabel: f.headshot.generationJob.stylePrompt,
		createdAt: f.headshot.createdAt,
		isFavorited: true,
	}));
}

export async function getTrash(userId: string) {
	const headshots = await prisma.generatedHeadshot.findMany({
		where: {
			isDeleted: true,
			generationJob: { userId },
		},
		include: { generationJob: true },
		orderBy: { createdAt: "desc" },
	});

	return headshots.map((h) => ({
		id: h.id,
		src: h.resultUrl,
		style: h.generationJob.styleId,
		styleLabel: h.generationJob.stylePrompt,
		createdAt: h.createdAt,
	}));
}

export async function restoreHeadshot(headshotId: string, userId: string) {
	const headshot = await prisma.generatedHeadshot.findFirst({
		where: { id: headshotId, generationJob: { userId } },
	});

	if (!headshot) {
		throw new Error("Not found or unauthorized");
	}

	await prisma.generatedHeadshot.update({
		where: { id: headshotId },
		data: { isDeleted: false },
	});
}

export async function permanentlyDeleteHeadshot(
	headshotId: string,
	userId: string,
) {
	const headshot = await prisma.generatedHeadshot.findFirst({
		where: { id: headshotId, isDeleted: true, generationJob: { userId } },
	});

	if (!headshot) {
		throw new Error("Not found or unauthorized");
	}

	// Extract R2 key from public URL
	try {
		const publicUrl = requireEnv("R2_PUBLIC_URL");
		const key = headshot.resultUrl.replace(`${publicUrl}/`, "");
		await deleteFromR2(key);
	} catch (_e) {
		// If R2 delete fails, still remove from DB (best-effort)
	}

	await prisma.generatedHeadshot.delete({ where: { id: headshotId } });
}
