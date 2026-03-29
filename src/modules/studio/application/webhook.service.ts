import { refundCredits } from "#/modules/credits";
import { updateHeadshotResultUrl } from "#/modules/studio/infrastructure/gallery.repository";
import { persistImageToR2 } from "#/modules/studio/infrastructure/photo.storage";
import {
	completeGenerationJob,
	failGenerationJob,
} from "../infrastructure/generation.repository";
import type { FalWebhookPayload } from "./webhook.schema";

const GENERATION_CREDIT_COST = 10;

interface WebhookResultInput {
	jobId: string;
	userId: string;
	photoId: string;
	payload: FalWebhookPayload;
}

export async function processWebhookResult({
	jobId,
	userId,
	photoId,
	payload,
}: WebhookResultInput) {
	const imageUrl = payload.payload?.images?.[0]?.url;

	if (payload.status === "ERROR" || !imageUrl) {
		await failGenerationJob(jobId);
		await refundCredits(userId, GENERATION_CREDIT_COST);
		return;
	}

	// Complete immediately with fal.ai URL — user sees image right away
	const headshotId = await completeGenerationJob(jobId, photoId, {
		resultUrl: imageUrl,
		thumbnailUrl: null,
		r2Key: null,
		r2ThumbnailKey: null,
	});

	// Fire-and-forget: upload to R2, silently update URL once done
	persistAndUpdateR2(headshotId, imageUrl, userId, jobId).catch(
		(err: unknown) => {
			console.warn(
				`Background R2 upload failed for job ${jobId}:`,
				err instanceof Error ? err.message : String(err),
			);
		},
	);
}

async function persistAndUpdateR2(
	headshotId: string,
	imageUrl: string,
	userId: string,
	jobId: string,
) {
	const persisted = await persistImageToR2(imageUrl, userId, jobId);
	await updateHeadshotResultUrl(
		headshotId,
		persisted.resultUrl,
		persisted.r2Key,
	);
}
