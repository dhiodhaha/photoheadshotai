import { prisma } from "#/lib/prisma";

export interface HistoryQueryOptions {
	userId: string;
	page: number;
	limit: number;
}

/**
 * Find paginated headshot history for a user
 * Includes generation job metadata (style, timestamp)
 */
export async function findHeadshotHistory({
	userId,
	page,
	limit,
}: HistoryQueryOptions) {
	const skip = (page - 1) * limit;

	const where = {
		isDeleted: false,
		generationJob: { userId },
	};

	const [headshots, total] = await prisma.$transaction([
		prisma.generatedHeadshot.findMany({
			where,
			include: { generationJob: true },
			orderBy: { createdAt: "desc" },
			skip,
			take: limit,
		}),
		prisma.generatedHeadshot.count({ where }),
	]);

	return {
		headshots,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
}
