import { prisma } from "#/lib/prisma";
import type { PhotoStatus } from "../domain/photo.entity";

export async function createPhoto(data: {
	userId: string;
	key: string;
	filename: string;
	contentType: string;
	size: number;
}) {
	return prisma.photo.create({ data });
}

export async function findPhotoById(id: string) {
	return prisma.photo.findUnique({ where: { id } });
}

export async function findPhotosByUser(
	userId: string,
	page: number,
	limit: number,
) {
	const [photos, total] = await Promise.all([
		prisma.photo.findMany({
			where: { userId },
			orderBy: { createdAt: "desc" },
			skip: (page - 1) * limit,
			take: limit,
		}),
		prisma.photo.count({ where: { userId } }),
	]);
	return { photos, total };
}

export async function updatePhotoStatus(id: string, status: PhotoStatus) {
	return prisma.photo.update({ where: { id }, data: { status } });
}

export async function deletePhoto(id: string) {
	return prisma.photo.delete({ where: { id } });
}
