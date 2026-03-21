import { generateImage } from "@tanstack/ai";
import { falImage } from "@tanstack/ai-fal";
import { prisma } from "#/lib/prisma";
import { deductUserCredits, refundCredits } from "#/modules/credits";
import { getPublicUrl } from "#/modules/studio/infrastructure/r2.server";

const GENERATION_CREDIT_COST = 10;

const HEADSHOT_PROMPT_TEMPLATE = (style: string) =>
	`A highly professional, cinematic, hyper-realistic upper-body portrait photography of the exact person in the reference image. The person is dressed cleanly, looking directly at the camera with a confident, slight smile. Style: ${style}. Studio lighting, soft shadows, 8k resolution, shot on 85mm lens.`;

export class GenerationService {
	async startGeneration(userId: string, photoId: string, style: string) {
		// 1. Fetch photo and validate ownership
		const photo = await prisma.photo.findUnique({
			where: { id: photoId },
		});

		if (!photo || photo.userId !== userId) {
			throw new Error("Photo not found or access denied.");
		}

		// 2. Deduct credits (throws if insufficient)
		await deductUserCredits(userId, GENERATION_CREDIT_COST);

		// 3. Create generation job
		const job = await prisma.generationJob.create({
			data: {
				userId,
				photoId: photo.id,
				status: "processing",
				stylePrompt: style,
				costCredits: GENERATION_CREDIT_COST,
			},
		});

		// 4. Start generation (for now we still wait, but logic is modular)
		return this.processGeneration(job.id, photo.key, style, userId, photo.id);
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

		const prompt = HEADSHOT_PROMPT_TEMPLATE(style);

		if (process.env.MOCK_AI_GENERATION === "true") {
			await new Promise((r) => setTimeout(r, 2000));
			const mockImageUrl =
				"https://images.unsplash.com/photo-1544168190-79c154273140?q=80&w=800";

			await this.updateJobSuccess(jobId, photoId, mockImageUrl);
			return { job_id: jobId, image_url: mockImageUrl };
		}

		try {
			// TODO: Remove `as any` casts when @tanstack/ai-fal ships stable types
			const adapter = falImage("fal-ai/flux-pulid", {
				apiKey: process.env.FAL_KEY!,
			});
			const result = await generateImage({
				adapter: adapter as any,
				prompt,
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
		} catch (error: unknown) {
			const message =
				error instanceof Error ? error.message : String(error);
			await this.handleGenerationFailure(jobId, userId, message);
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

	private async handleGenerationFailure(
		jobId: string,
		userId: string,
		errorMessage: string,
	) {
		console.error(`Job ${jobId} failed: ${errorMessage}`);

		await prisma.generationJob.update({
			where: { id: jobId },
			data: { status: "failed" },
		});

		await refundCredits(userId, GENERATION_CREDIT_COST);
	}

	async getJobStatus(jobId: string, userId: string) {
		const job = await prisma.generationJob.findUnique({
			where: { id: jobId },
			include: {
				generatedHeadshots: { take: 1 },
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
