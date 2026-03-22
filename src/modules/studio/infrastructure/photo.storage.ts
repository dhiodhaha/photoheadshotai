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
