import { prisma } from "#/lib/prisma";

export async function getPhotoByIdAndUser(photoId: string, userId: string) {
	return prisma.photo
		.findUnique({
			where: { id: photoId },
		})
		.then((photo) => {
			if (!photo || photo.userId !== userId) return null;
			return photo;
		});
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
			status: "processing",
			styleId: data.styleId,
			stylePrompt: data.stylePrompt,
			costCredits: data.costCredits,
		},
	});
}

export async function completeGenerationJob(
	jobId: string,
	photoId: string,
	imageUrl: string,
) {
	await prisma.$transaction([
		prisma.generationJob.update({
			where: { id: jobId },
			data: { status: "completed", completedAt: new Date() },
		}),
		prisma.photo.update({
			where: { id: photoId },
			data: { status: "completed" },
		}),
		prisma.generatedHeadshot.create({
			data: {
				generationJobId: jobId,
				resultUrl: imageUrl,
			},
		}),
	]);
}

export async function failGenerationJob(jobId: string) {
	await prisma.generationJob.update({
		where: { id: jobId },
		data: { status: "failed" },
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
