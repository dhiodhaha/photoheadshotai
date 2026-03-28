import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getBucketName, getPublicUrl, getR2Client } from "./r2.server";

export async function uploadToR2(
	key: string,
	body: Buffer,
	contentType: string,
): Promise<void> {
	const client = getR2Client();
	await client.send(
		new PutObjectCommand({
			Bucket: getBucketName(),
			Key: key,
			Body: body,
			ContentType: contentType,
		}),
	);
}

export async function deleteFromR2(key: string): Promise<void> {
	const client = getR2Client();
	await client.send(
		new DeleteObjectCommand({
			Bucket: getBucketName(),
			Key: key,
		}),
	);
}

/**
 * Fetch image from fal.ai and persist to R2.
 * Returns the R2 public URL and key, or throws on failure.
 * Caller should wrap in try/catch and fall back to fal.ai URL if needed.
 */
export async function persistImageToR2(
	falUrl: string,
	userId: string,
	headshotId: string,
): Promise<{ resultUrl: string; r2Key: string }> {
	const res = await fetch(falUrl);
	if (!res.ok) {
		throw new Error(`Failed to fetch image from fal.ai: HTTP ${res.status}`);
	}

	const buffer = Buffer.from(await res.arrayBuffer());
	if (buffer.length === 0) {
		throw new Error("Received empty image body from fal.ai");
	}

	const key = `headshots/${userId}/${headshotId}.png`;
	const client = getR2Client();
	if (!client) {
		throw new Error("R2 not configured");
	}

	await client.send(
		new PutObjectCommand({
			Bucket: getBucketName(),
			Key: key,
			Body: buffer,
			ContentType: "image/png",
		}),
	);

	return { resultUrl: getPublicUrl(key), r2Key: key };
}

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
