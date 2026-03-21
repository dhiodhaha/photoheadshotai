import { prisma } from "#/lib/prisma";

interface HistoryOptions {
	userId: string;
	page: number;
	limit: number;
}

export async function getGenerationHistory({
	userId,
	page,
	limit,
}: HistoryOptions) {
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
		headshots: headshots.map((h) => ({
			id: h.id,
			src: h.resultUrl,
			style: h.generationJob.stylePrompt,
			createdAt: h.createdAt,
		})),
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
}
