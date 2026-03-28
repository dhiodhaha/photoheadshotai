import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getBucketName, getR2Client } from "./r2.server";

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
