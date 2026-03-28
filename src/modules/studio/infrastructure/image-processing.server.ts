import sharp from "sharp";
import { deleteFromR2, uploadToR2 } from "./photo.storage";
import { getPublicUrl } from "./r2.server";

export interface PersistedImage {
	resultUrl: string;
	thumbnailUrl: string;
	r2Key: string | null;
	r2ThumbnailKey: string | null;
}

/**
 * Fetch image from fal.ai with up to 3 retries.
 * TLS "bad record mac" errors are transient — retrying resolves them.
 */
async function fetchImageWithRetry(
	url: string,
	maxAttempts = 3,
): Promise<Buffer> {
	let lastError: unknown;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			const res = await fetch(url);
			if (!res.ok) {
				throw new Error(`HTTP ${res.status} ${res.statusText}`);
			}

			const buffer = Buffer.from(await res.arrayBuffer());

			if (buffer.length === 0) {
				throw new Error("Received empty image body from fal.ai");
			}

			// Validate the buffer is a real decodable image.
			// TLS corruption produces non-empty garbage that sharp rejects
			// here, rather than silently producing a white/blank output.
			const meta = await sharp(buffer).metadata();
			if (!meta.width || !meta.height) {
				throw new Error("Image metadata missing — data is corrupt");
			}

			return buffer;
		} catch (error: unknown) {
			lastError = error;
			const msg = error instanceof Error ? error.message : String(error);
			console.warn(`Fetch attempt ${attempt}/${maxAttempts} failed: ${msg}`);

			if (attempt < maxAttempts) {
				// Exponential backoff: 500ms, 1000ms
				await new Promise((r) => setTimeout(r, 500 * attempt));
			}
		}
	}

	throw new Error(
		`Failed to fetch image from fal.ai after ${maxAttempts} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
	);
}

/**
 * Persist generated image from fal.ai to R2
 * 1. Fetch the full-res 2K PNG from fal.ai (with retry)
 * 2. Validate buffer is non-empty
 * 3. Upload original to R2 as headshots/{userId}/{headshotId}.png
 * 4. Compress to 400px WebP (~15-30KB) for gallery thumbnail
 * 5. Upload thumbnail to R2 as headshots/{userId}/{headshotId}_thumb.webp
 */
export async function persistGeneratedImage(
	falUrl: string,
	userId: string,
	headshotId: string,
): Promise<PersistedImage> {
	const imageBuffer = await fetchImageWithRetry(falUrl);

	const originalKey = `headshots/${userId}/${headshotId}.png`;
	const thumbnailKey = `headshots/${userId}/${headshotId}_thumb.webp`;

	await uploadToR2(originalKey, imageBuffer, "image/png");

	let thumbnailBuffer: Buffer;
	try {
		thumbnailBuffer = await sharp(imageBuffer)
			.resize(400, 400, { fit: "cover" })
			.webp({ quality: 80 })
			.toBuffer();
	} catch (error: unknown) {
		await deleteFromR2(originalKey);
		throw new Error(
			`Failed to process thumbnail: ${error instanceof Error ? error.message : "unknown error"}`,
		);
	}

	try {
		await uploadToR2(thumbnailKey, thumbnailBuffer, "image/webp");
	} catch (error: unknown) {
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

	if (r2Key) promises.push(deleteFromR2(r2Key).catch(() => {}));
	if (r2ThumbnailKey)
		promises.push(deleteFromR2(r2ThumbnailKey).catch(() => {}));

	if (promises.length > 0) await Promise.all(promises);
}
