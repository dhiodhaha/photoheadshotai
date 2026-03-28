import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireEnv } from "#/lib/env";

let cachedClient: S3Client | null = null;

export function getR2Client() {
	if (requireEnv("R2_ACCOUNT_ID") === "placeholder_account_id") {
		return null; // Mock mode
	}

	if (cachedClient) return cachedClient;

	cachedClient = new S3Client({
		region: "auto",
		endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
			secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
		},
		maxAttempts: 3,
	});

	return cachedClient;
}

export function getBucketName() {
	return requireEnv("R2_BUCKET_NAME");
}

export function getPublicUrl(key: string) {
	return `${requireEnv("R2_PUBLIC_URL")}/${key}`;
}

export async function getPresignedUrl(key: string, expiresIn = 3600) {
	const client = getR2Client();
	if (!client) {
		throw new Error("R2 client not available in mock mode");
	}
	const command = new GetObjectCommand({
		Bucket: getBucketName(),
		Key: key,
	});
	return getSignedUrl(client, command, { expiresIn });
}
