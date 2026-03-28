/**
 * R2 Pipeline Integration Test
 *
 * Tests the full image persistence pipeline (upload original + thumbnail)
 * using a local sample image instead of fetching from fal.ai.
 *
 * Usage:
 *   dotenv -e .env.local -- npx tsx scripts/test-r2-pipeline.ts
 *
 * What this tests:
 *   ✓ R2 connectivity from your machine
 *   ✓ Sharp thumbnail generation
 *   ✓ Original + thumbnail upload to R2
 *   ✓ Public URL is accessible in browser
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

if (
	!R2_ACCOUNT_ID ||
	!R2_ACCESS_KEY_ID ||
	!R2_SECRET_ACCESS_KEY ||
	!R2_BUCKET_NAME ||
	!R2_PUBLIC_URL
) {
	console.error(
		"❌ Missing R2 env vars. Run with: dotenv -e .env.local -- npx tsx scripts/test-r2-pipeline.ts",
	);
	process.exit(1);
}

if (R2_ACCOUNT_ID === "placeholder_account_id") {
	console.error(
		"❌ R2 is in placeholder/mock mode. Set real R2 credentials in .env.local",
	);
	process.exit(1);
}

const { S3Client, PutObjectCommand, DeleteObjectCommand } = await import(
	"@aws-sdk/client-s3"
);

const client = new S3Client({
	region: "auto",
	endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: R2_ACCESS_KEY_ID,
		secretAccessKey: R2_SECRET_ACCESS_KEY,
	},
	maxAttempts: 3,
});

const TEST_USER_ID = "test-user";
const TEST_JOB_ID = `test-${Date.now()}`;
const originalKey = `headshots/${TEST_USER_ID}/${TEST_JOB_ID}.png`;
const thumbnailKey = `headshots/${TEST_USER_ID}/${TEST_JOB_ID}_thumb.webp`;

async function upload(key: string, body: Buffer, contentType: string) {
	await client.send(
		new PutObjectCommand({
			Bucket: R2_BUCKET_NAME,
			Key: key,
			Body: body,
			ContentType: contentType,
		}),
	);
}

async function cleanup(key: string) {
	try {
		await client.send(
			new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }),
		);
	} catch {
		// ignore cleanup errors
	}
}

async function run() {
	console.log("🧪 Testing R2 image pipeline...\n");

	// 1. Create a synthetic test image with sharp (avoids fal.ai fetch entirely)
	console.log("1. Generating synthetic 100x100 test image with sharp...");
	const imageBuffer = await sharp({
		create: {
			width: 100,
			height: 100,
			channels: 3,
			background: { r: 100, g: 149, b: 237 }, // cornflower blue
		},
	})
		.png()
		.toBuffer();
	console.log(`   ✓ Image buffer: ${imageBuffer.length} bytes`);

	// 2. Validate with sharp (same check we do in production)
	const meta = await sharp(imageBuffer).metadata();
	if (!meta.width || !meta.height) throw new Error("Buffer validation failed");
	console.log(`   ✓ Validated: ${meta.width}x${meta.height} ${meta.format}`);

	// 3. Create thumbnail
	console.log("\n2. Creating 400px WebP thumbnail...");
	const thumbnailBuffer = await sharp(imageBuffer)
		.resize(400, 400, { fit: "cover" })
		.webp({ quality: 80 })
		.toBuffer();
	console.log(`   ✓ Thumbnail buffer: ${thumbnailBuffer.length} bytes`);

	// 4. Upload original to R2
	console.log("\n3. Uploading original PNG to R2...");
	try {
		await upload(originalKey, imageBuffer, "image/png");
		console.log(`   ✓ Uploaded: ${originalKey}`);
	} catch (e) {
		console.error(`   ❌ Upload failed:`, e);
		process.exit(1);
	}

	// 5. Upload thumbnail to R2
	console.log("\n4. Uploading thumbnail WebP to R2...");
	try {
		await upload(thumbnailKey, thumbnailBuffer, "image/webp");
		console.log(`   ✓ Uploaded: ${thumbnailKey}`);
	} catch (e) {
		console.error(`   ❌ Thumbnail upload failed:`, e);
		await cleanup(originalKey);
		process.exit(1);
	}

	// 6. Verify public URLs are accessible
	console.log("\n5. Verifying public URLs are accessible...");
	const originalUrl = `${R2_PUBLIC_URL}/${originalKey}`;
	const thumbnailUrl = `${R2_PUBLIC_URL}/${thumbnailKey}`;

	const [origRes, thumbRes] = await Promise.all([
		fetch(originalUrl),
		fetch(thumbnailUrl),
	]);

	if (!origRes.ok) {
		console.error(
			`   ❌ Original URL returned ${origRes.status}: ${originalUrl}`,
		);
	} else {
		console.log(
			`   ✓ Original accessible (${origRes.headers.get("content-length")} bytes)`,
		);
		console.log(`     → ${originalUrl}`);
	}

	if (!thumbRes.ok) {
		console.error(
			`   ❌ Thumbnail URL returned ${thumbRes.status}: ${thumbnailUrl}`,
		);
	} else {
		console.log(
			`   ✓ Thumbnail accessible (${thumbRes.headers.get("content-length")} bytes)`,
		);
		console.log(`     → ${thumbnailUrl}`);
	}

	// 7. Cleanup
	console.log("\n6. Cleaning up test files from R2...");
	await Promise.all([cleanup(originalKey), cleanup(thumbnailKey)]);
	console.log("   ✓ Cleaned up");

	if (origRes.ok && thumbRes.ok) {
		console.log("\n✅ R2 pipeline works! Images upload and serve correctly.");
		console.log(
			"   Your blank image issue is specific to fetching from fal.ai CDN on your network.",
		);
	} else {
		console.log(
			"\n⚠️  R2 pipeline has issues. Check bucket public access settings.",
		);
	}
}

run().catch((e) => {
	console.error("\n❌ Test failed:", e);
	process.exit(1);
});
