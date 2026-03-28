import { fal } from "@fal-ai/client";
import { deductUserCredits, refundCredits } from "#/modules/credits";
import {
	getFalKey,
	getPhotoUrlForGeneration,
	isMockAiGeneration,
} from "#/modules/studio/infrastructure/generation-context.server";
import { persistImageToR2 } from "#/modules/studio/infrastructure/photo.storage";
import { buildPrompt, getStyleById } from "../domain/styles";
import {
	completeGenerationJob,
	createGenerationJob,
	failGenerationJob,
	getJobWithResults,
	getPhotoByIdAndUser,
} from "../infrastructure/generation.repository";

// Configure fal.ai SDK once at module init — not per-job (avoids re-init overhead + race conditions)
fal.config({ credentials: getFalKey() });

const GENERATION_CREDIT_COST = 10;
const SEEDREAM_MODEL = "fal-ai/bytedance/seedream/v4.5/edit";
const MOCK_IMAGE_URL =
	"https://images.unsplash.com/photo-1544168190-79c154273140?q=80&w=800";

export class GenerationService {
	async startGeneration(userId: string, photoId: string, style: string) {
		const headshotStyle = getStyleById(style);
		if (!headshotStyle) {
			throw new Error("Invalid style. Please select a valid style.");
		}

		const photo = await getPhotoByIdAndUser(photoId, userId);
		if (!photo) {
			throw new Error("Photo not found or access denied.");
		}

		await deductUserCredits(userId, GENERATION_CREDIT_COST);

		const job = await createGenerationJob({
			userId,
			photoId: photo.id,
			styleId: headshotStyle.id,
			stylePrompt: headshotStyle.prompt,
			costCredits: GENERATION_CREDIT_COST,
		});

		// Fire and forget — do NOT await
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
		const photoUrl = await getPhotoUrlForGeneration(photoKey);
		const prompt = buildPrompt(style);

		if (isMockAiGeneration()) {
			await new Promise((r) => setTimeout(r, 2000));
			await completeGenerationJob(jobId, photoId, {
				resultUrl: MOCK_IMAGE_URL,
				thumbnailUrl: null,
				r2Key: null,
				r2ThumbnailKey: null,
			});
			return;
		}

		try {
			const result = await fal.subscribe(SEEDREAM_MODEL, {
				input: {
					prompt,
					image_urls: [photoUrl],
					image_size: { width: 2048, height: 2048 },
					num_images: 1,
					enable_safety_checker: true,
				},
			});

			const imageUrl = result.data?.images?.[0]?.url;
			if (imageUrl) {
				let resultUrl = imageUrl;
				let r2Key: string | null = null;

				try {
					const persisted = await persistImageToR2(imageUrl, userId, jobId);
					resultUrl = persisted.resultUrl;
					r2Key = persisted.r2Key;
				} catch (r2Error: unknown) {
					const msg =
						r2Error instanceof Error ? r2Error.message : String(r2Error);
					console.warn(
						`R2 upload failed for job ${jobId}, using fal.ai URL: ${msg}`,
					);
				}

				await completeGenerationJob(jobId, photoId, {
					resultUrl,
					thumbnailUrl: null,
					r2Key,
					r2ThumbnailKey: null,
				});
				return;
			}
			throw new Error("AI Provider returned no image.");
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			if (error instanceof Error && "body" in error) {
				console.error(
					`Job ${jobId} failed: ${message}`,
					JSON.stringify((error as Record<string, unknown>).body, null, 2),
				);
			} else {
				console.error(`Job ${jobId} failed: ${message}`);
			}
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
