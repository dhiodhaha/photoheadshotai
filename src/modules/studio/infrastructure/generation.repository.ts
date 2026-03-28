import { GenerationJobStatus, PhotoStatus } from "#/generated/prisma/enums.js";
import { prisma } from "#/lib/prisma";

export async function getPhotoByIdAndUser(photoId: string, userId: string) {
	return prisma.photo.findFirst({ where: { id: photoId, userId } });
}

export async function createGenerationJob(data: {
	userId: string;
	photoId: string;
	styleId: string;
	stylePrompt: string;
	costCredits: number;
}) {
	return prisma.generationJob.create({
		data: {
			userId: data.userId,
			photoId: data.photoId,
			status: GenerationJobStatus.processing,
			styleId: data.styleId,
			stylePrompt: data.stylePrompt,
			costCredits: data.costCredits,
		},
	});
}

export async function completeGenerationJob(
	jobId: string,
	photoId: string,
	imageData: {
		resultUrl: string;
		thumbnailUrl: string;
		r2Key: string | null;
		r2ThumbnailKey: string | null;
	},
) {
	await prisma.$transaction([
		prisma.generationJob.update({
			where: { id: jobId },
			data: { status: GenerationJobStatus.completed, completedAt: new Date() },
		}),
		prisma.photo.update({
			where: { id: photoId },
			data: { status: PhotoStatus.completed },
		}),
		prisma.generatedHeadshot.create({
			data: {
				generationJobId: jobId,
				resultUrl: imageData.resultUrl,
				thumbnailUrl: imageData.thumbnailUrl,
				r2Key: imageData.r2Key,
				r2ThumbnailKey: imageData.r2ThumbnailKey,
			},
		}),
	]);
}

export async function failGenerationJob(jobId: string) {
	await prisma.generationJob.update({
		where: { id: jobId },
		data: { status: GenerationJobStatus.failed },
	});
}

export async function getJobWithResults(jobId: string, userId: string) {
	const job = await prisma.generationJob.findUnique({
		where: { id: jobId },
		include: { generatedHeadshots: { take: 1 } },
	});

	if (!job || job.userId !== userId) return null;

	return {
		id: job.id,
		status: job.status,
		resultUrl: job.generatedHeadshots[0]?.resultUrl || null,
		createdAt: job.startedAt,
		completedAt: job.completedAt,
	};
}
