import { generateImage } from "@tanstack/ai";
import { falImage } from "@tanstack/ai-fal";
import { prisma } from "#/lib/prisma";
import { getPublicUrl } from "#/modules/studio/infrastructure/r2.server";

export class GenerationService {
	async startGeneration(userId: string, photoId: string, style: string) {
		// 1. Verify User has Enough Credits
		const user = await prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user || user.currentCredits < 10) {
			throw new Error("Insufficient credits. Please top up.");
		}

		// 2. Fetch the uploaded photo record
		const photo = await prisma.photo.findUnique({
			where: { id: photoId },
		});

		if (!photo || photo.userId !== userId) {
			throw new Error("Photo not found or access denied.");
		}

		// 3. Deduct 10 Credits Immediately & Log Transaction
		await prisma.$transaction([
			prisma.user.update({
				where: { id: user.id },
				data: { currentCredits: user.currentCredits - 10 },
			}),
			prisma.creditTransaction.create({
				data: {
					userId: user.id,
					amount: -10,
					transactionType: "GENERATION_DEDUCTION",
				},
			}),
		]);

		// 4. Create a "Generation Job" record
		const job = await prisma.generationJob.create({
			data: {
				userId: user.id,
				photoId: photo.id,
				status: "PROCESSING",
				stylePrompt: style,
				costCredits: 10,
			},
		});

		// Start background process (for now we still wait, but logic is modular)
		return this.processGeneration(job.id, photo.key, style, user.id, photo.id);
	}

	private async processGeneration(
		jobId: string,
		photoKey: string,
		style: string,
		userId: string,
		photoId: string,
	) {
		const photoUrl =
			process.env.R2_ACCOUNT_ID === "placeholder_account_id"
				? "https://fastly.picsum.photos/id/64/4326/2884.jpg"
				: getPublicUrl(photoKey);

		const prompt = `A highly professional, cinematic, hyper-realistic upper-body portrait photography of the exact person in the reference image. The person is dressed cleanly, looking directly at the camera with a confident, slight smile. Style: ${style}. Studio lighting, soft shadows, 8k resolution, shot on 85mm lens.`;

		if (process.env.MOCK_AI_GENERATION === "true") {
			await new Promise((r) => setTimeout(r, 2000));
			const mockImageUrl =
				"https://images.unsplash.com/photo-1544168190-79c154273140?q=80&w=800";

			await this.updateJobSuccess(jobId, photoId, mockImageUrl);
			return { job_id: jobId, image_url: mockImageUrl };
		}

		try {
			const adapter = falImage("fal-ai/flux-pulid", {
				apiKey: process.env.FAL_KEY!,
			});
			const result = await generateImage({
				adapter: adapter as any,
				prompt: prompt,
				numberOfImages: 1,
				modelOptions: {
					image_url: photoUrl,
					id_weight: 1.0,
					num_inference_steps: 30,
					guidance_scale: 1.2,
					width: 1024,
					height: 1024,
					enable_safety_checker: true,
				} as any,
			});

			if (result.images?.[0]?.url) {
				const imageUrl = result.images[0].url;
				await this.updateJobSuccess(jobId, photoId, imageUrl);
				return { job_id: jobId, image_url: imageUrl };
			} else {
				throw new Error("AI Provider returned no image.");
			}
		} catch (error: any) {
			await this.handleGenerationFailure(jobId, userId, error.message);
			throw error;
		}
	}

	private async updateJobSuccess(
		jobId: string,
		photoId: string,
		imageUrl: string,
	) {
		await prisma.$transaction([
			prisma.generationJob.update({
				where: { id: jobId },
				data: { status: "COMPLETED", completedAt: new Date() },
			}),
			prisma.photo.update({
				where: { id: photoId },
				data: { status: "active" },
			}),
			prisma.generatedHeadshot.create({
				data: {
					generationJobId: jobId,
					resultUrl: imageUrl,
				},
			}),
		]);
	}

	private async handleGenerationFailure(
		jobId: string,
		userId: string,
		errorMessage: string,
	) {
		console.error(`Job ${jobId} failed: ${errorMessage}`);
		await prisma.$transaction([
			prisma.generationJob.update({
				where: { id: jobId },
				data: { status: "FAILED" },
			}),
			prisma.user.update({
				where: { id: userId },
				data: { currentCredits: { increment: 10 } },
			}),
			prisma.creditTransaction.create({
				data: {
					userId: userId,
					amount: 10,
					transactionType: "GENERATION_REFUND",
				},
			}),
		]);
	}

	async getJobStatus(jobId: string, userId: string) {
		const job = await prisma.generationJob.findUnique({
			where: { id: jobId },
			include: {
				generatedHeadshots: true,
			},
		});

		if (!job || job.userId !== userId) {
			throw new Error("Job not found or access denied.");
		}

		return {
			id: job.id,
			status: job.status,
			resultUrl: job.generatedHeadshots[0]?.resultUrl || null,
			createdAt: job.startedAt,
			completedAt: job.completedAt,
		};
	}
}

export const generationService = new GenerationService();
