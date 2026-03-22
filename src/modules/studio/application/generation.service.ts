import { fal } from "@fal-ai/client";
import { deductUserCredits, refundCredits } from "#/modules/credits";
import { getPublicUrl } from "#/modules/studio/infrastructure/r2.server";
import { buildPrompt, getStyleById } from "../domain/styles";
import {
	completeGenerationJob,
	createGenerationJob,
	failGenerationJob,
	getJobWithResults,
	getPhotoByIdAndUser,
} from "../infrastructure/generation.repository";

const GENERATION_CREDIT_COST = 10;
const SEEDREAM_MODEL = "fal-ai/bytedance/seedream/v4.5/edit";

export class GenerationService {
	async startGeneration(userId: string, photoId: string, style: string) {
		// 1. Validate style
		const headshotStyle = getStyleById(style);
		if (!headshotStyle) {
			throw new Error("Invalid style. Please select a valid style.");
		}

		// 2. Fetch photo and validate ownership
		const photo = await getPhotoByIdAndUser(photoId, userId);
		if (!photo) {
			throw new Error("Photo not found or access denied.");
		}

		// 3. Deduct credits (throws if insufficient)
		await deductUserCredits(userId, GENERATION_CREDIT_COST);

		// 4. Create generation job
		const job = await createGenerationJob({
			userId,
			photoId: photo.id,
			styleId: headshotStyle.id,
			stylePrompt: headshotStyle.prompt,
			costCredits: GENERATION_CREDIT_COST,
		});

		// 5. Fire and forget — do NOT await
		this.processGeneration(
			job.id,
			photo.key,
			headshotStyle.prompt,
			userId,
			photo.id,
		).catch((error: unknown) => {
			console.error("Background generation failed:", error);
		});

		return { job_id: job.id, cost_credits: GENERATION_CREDIT_COST };
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
				? "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1024&q=80"
				: getPublicUrl(photoKey);

		const prompt = buildPrompt(style);

		if (process.env.MOCK_AI_GENERATION === "true") {
			await new Promise((r) => setTimeout(r, 2000));
			const mockImageUrl =
				"https://images.unsplash.com/photo-1544168190-79c154273140?q=80&w=800";

			await completeGenerationJob(jobId, photoId, mockImageUrl);
			return;
		}

		try {
			const falKey = process.env.FAL_KEY;
			if (!falKey) {
				throw new Error("FAL_KEY environment variable is not set.");
			}

			fal.config({ credentials: falKey });

			const result = await fal.subscribe(SEEDREAM_MODEL, {
				input: {
					prompt,
					image_urls: [photoUrl],
					image_size: { width: 1024, height: 1024 },
					num_images: 1,
					enable_safety_checker: true,
				},
			});

			const imageUrl = result.data?.images?.[0]?.url;
			if (imageUrl) {
				await completeGenerationJob(jobId, photoId, imageUrl);
				return;
			}
			throw new Error("AI Provider returned no image.");
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			console.error(`Job ${jobId} failed: ${message}`);
			await failGenerationJob(jobId);
			await refundCredits(userId, GENERATION_CREDIT_COST);
			throw error;
		}
	}

	async getJobStatus(jobId: string, userId: string) {
		const job = await getJobWithResults(jobId, userId);
		if (!job) {
			throw new Error("Job not found or access denied.");
		}
		return job;
	}
}

export const generationService = new GenerationService();
