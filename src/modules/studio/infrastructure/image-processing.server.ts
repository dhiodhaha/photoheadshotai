import sharp from "sharp";
import { deleteFromR2, uploadToR2 } from "./photo.storage";
import { getBucketName, getPublicUrl } from "./r2.server";

/**
 * Domain: Image persistence and processing
 * Persists fal.ai generated images to R2 and creates compressed thumbnails
 */
export interface PersistedImage {
	resultUrl: string;
	thumbnailUrl: string;
	r2Key: string | null;
	r2ThumbnailKey: string | null;
}

/**
 * Persist generated image from fal.ai to R2
 * 1. Fetch the full-res 2K PNG from fal.ai
 * 2. Upload original to R2 as headshots/{userId}/{headshotId}.png
 * 3. Compress to 400px WebP (15-30KB) for gallery thumbnail
 * 4. Upload thumbnail to R2 as headshots/{userId}/{headshotId}_thumb.webp
 */
export async function persistGeneratedImage(
	falUrl: string,
	userId: string,
	headshotId: string,
): Promise<PersistedImage> {
	// Fetch the generated image from fal.ai
	const imageRes = await fetch(falUrl);
	if (!imageRes.ok) {
		throw new Error(
			`Failed to fetch generated image from fal.ai: ${imageRes.statusText}`,
		);
	}
	const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

	// Generate R2 keys using DDD-friendly naming
	const originalKey = `headshots/${userId}/${headshotId}.png`;
	const thumbnailKey = `headshots/${userId}/${headshotId}_thumb.webp`;

	// Upload original to R2
	await uploadToR2(originalKey, imageBuffer, "image/png");

	// Create and upload thumbnail (400px wide, 80% WebP quality ~15-30KB)
	let thumbnailBuffer: Buffer;
	try {
		thumbnailBuffer = await sharp(imageBuffer)
			.resize(400, 400, { fit: "cover" })
			.webp({ quality: 80 })
			.toBuffer();
	} catch (error: unknown) {
		// Cleanup original upload if thumbnail generation fails
		await deleteFromR2(originalKey);
		throw new Error(
			`Failed to process thumbnail: ${error instanceof Error ? error.message : "unknown error"}`,
		);
	}

	try {
		await uploadToR2(thumbnailKey, thumbnailBuffer, "image/webp");
	} catch (error: unknown) {
		// Cleanup original upload if thumbnail upload fails
		await deleteFromR2(originalKey);
		throw new Error(
			`Failed to upload thumbnail: ${error instanceof Error ? error.message : "unknown error"}`,
		);
	}

	return {
		resultUrl: getPublicUrl(originalKey),
		thumbnailUrl: getPublicUrl(thumbnailKey),
		r2Key: originalKey,
		r2ThumbnailKey: thumbnailKey,
	};
}

/**
 * Clean up R2 objects when a headshot is permanently deleted
 */
export async function deletePersistedImage(
	r2Key: string | null,
	r2ThumbnailKey: string | null,
) {
	const promises: Promise<void>[] = [];

	if (r2Key) {
		promises.push(deleteFromR2(r2Key).catch(() => {})); // Ignore errors on deletion
	}
	if (r2ThumbnailKey) {
		promises.push(deleteFromR2(r2ThumbnailKey).catch(() => {})); // Ignore errors on deletion
	}

	if (promises.length > 0) {
		await Promise.all(promises);
	}
}
