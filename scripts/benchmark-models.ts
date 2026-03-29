/**
 * AI Model Benchmark — Headshot Generation
 *
 * Tests 5 models with the same input photo + headshot prompt.
 * Measures wall-clock time, captures output URL, and logs cost.
 *
 * Usage:
 *   npx dotenv -e .env.local -- npx tsx scripts/benchmark-models.ts
 *
 * Results are written to scripts/benchmark-results.json
 */

import { writeFileSync } from "node:fs";
import { fal } from "@fal-ai/client";

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
	console.error(
		"FAL_KEY is not set. Run with: npx dotenv -e .env.local -- npx tsx scripts/benchmark-models.ts",
	);
	process.exit(1);
}

fal.config({ credentials: FAL_KEY });

// ─── Config ───────────────────────────────────────────────────────────────────

// A real person photo — replace with your own presigned R2 URL for more accurate results
const TEST_PHOTO_URL =
	"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1024&q=80";

// Using the "Executive" style prompt from the app
const TEST_PROMPT =
	"Transform the person in Figure 1 into a professional corporate headshot. Dress them in a clean navy business suit. Place them against a neutral gray studio background with soft even lighting. Keep their face, features, and identity exactly the same. Sharp focus, professional quality.";

// ─── Models ───────────────────────────────────────────────────────────────────

type ModelConfig = {
	name: string;
	modelId: string;
	pricePerImage: number;
	buildInput: () => Record<string, unknown>;
};

const MODELS: ModelConfig[] = [
	{
		name: "Seedream v4.5 (current)",
		modelId: "fal-ai/bytedance/seedream/v4.5/edit",
		pricePerImage: 0.04,
		buildInput: () => ({
			prompt: TEST_PROMPT,
			image_urls: [TEST_PHOTO_URL],
			image_size: { width: 2048, height: 2048 },
			num_images: 1,
			enable_safety_checker: true,
		}),
	},
	{
		name: "Seedream v5.0 Lite",
		modelId: "fal-ai/bytedance/seedream/v5/lite/edit",
		pricePerImage: 0.035,
		buildInput: () => ({
			prompt: TEST_PROMPT,
			image_urls: [TEST_PHOTO_URL],
			image_size: "auto_2K",
			num_images: 1,
			enable_safety_checker: true,
		}),
	},
	{
		name: "FLUX Kontext Pro",
		modelId: "fal-ai/flux-pro/kontext",
		pricePerImage: 0.04,
		buildInput: () => ({
			prompt: TEST_PROMPT,
			image_url: TEST_PHOTO_URL,
			num_images: 1,
		}),
	},
	{
		name: "FLUX Kontext Max",
		modelId: "fal-ai/flux-pro/kontext-max",
		pricePerImage: 0.08,
		buildInput: () => ({
			prompt: TEST_PROMPT,
			image_url: TEST_PHOTO_URL,
			num_images: 1,
		}),
	},
	{
		name: "FLUX Dev (image-to-image)",
		modelId: "fal-ai/flux/dev/image-to-image",
		pricePerImage: 0.025,
		buildInput: () => ({
			prompt: TEST_PROMPT,
			image_url: TEST_PHOTO_URL,
			num_images: 1,
			strength: 0.85,
		}),
	},
];

// ─── Runner ───────────────────────────────────────────────────────────────────

type BenchmarkResult = {
	name: string;
	modelId: string;
	status: "success" | "failed";
	durationMs: number;
	durationSec: number;
	imageUrl: string | null;
	pricePerImage: number;
	error?: string;
};

async function runModel(model: ModelConfig): Promise<BenchmarkResult> {
	console.log(`\n▶ Testing: ${model.name} (${model.modelId})`);
	const start = Date.now();

	try {
		const result = await fal.subscribe(model.modelId, {
			input: model.buildInput(),
			onQueueUpdate: (update) => {
				process.stdout.write(`  status: ${update.status}\r`);
			},
		});

		const durationMs = Date.now() - start;
		// Try both `images[0].url` (array) and `image.url` (singular) response shapes
		const images = (result.data as Record<string, unknown>)?.images as
			| Array<{ url: string }>
			| undefined;
		const imageObj = (result.data as Record<string, unknown>)?.image as
			| { url: string }
			| undefined;
		const imageUrl = images?.[0]?.url ?? imageObj?.url ?? null;

		console.log(`  ✅ Done in ${(durationMs / 1000).toFixed(1)}s`);
		if (imageUrl) console.log(`  🖼  ${imageUrl}`);

		return {
			name: model.name,
			modelId: model.modelId,
			status: "success",
			durationMs,
			durationSec: Math.round(durationMs / 100) / 10,
			imageUrl,
			pricePerImage: model.pricePerImage,
		};
	} catch (error: unknown) {
		const durationMs = Date.now() - start;
		const message = error instanceof Error ? error.message : String(error);
		console.log(
			`  ❌ Failed after ${(durationMs / 1000).toFixed(1)}s: ${message}`,
		);

		return {
			name: model.name,
			modelId: model.modelId,
			status: "failed",
			durationMs,
			durationSec: Math.round(durationMs / 100) / 10,
			imageUrl: null,
			pricePerImage: model.pricePerImage,
			error: message,
		};
	}
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
	console.log("═══════════════════════════════════════════════════");
	console.log("  AI Model Benchmark — Headshot Generation");
	console.log("═══════════════════════════════════════════════════");
	console.log(`  Input photo : ${TEST_PHOTO_URL}`);
	console.log(`  Models      : ${MODELS.length}`);
	console.log("  Running sequentially to avoid rate limits...");

	const results: BenchmarkResult[] = [];

	for (const model of MODELS) {
		const result = await runModel(model);
		results.push(result);
		// Small pause between models to avoid hammering the API
		await new Promise((r) => setTimeout(r, 2000));
	}

	// ─── Summary ────────────────────────────────────────────────────────────────

	console.log("\n\n═══════════════════════════════════════════════════");
	console.log("  RESULTS SUMMARY");
	console.log("═══════════════════════════════════════════════════");
	console.log(
		`${"Model".padEnd(28)} ${"Time".padStart(8)} ${"Cost".padStart(8)}  Status`,
	);
	console.log("─".repeat(60));

	const sorted = [...results].sort((a, b) => a.durationMs - b.durationMs);
	for (const r of sorted) {
		const time = r.status === "success" ? `${r.durationSec}s` : "failed";
		const cost = `$${r.pricePerImage.toFixed(3)}`;
		const status = r.status === "success" ? "✅" : "❌";
		console.log(
			`${r.name.padEnd(28)} ${time.padStart(8)} ${cost.padStart(8)}  ${status}`,
		);
	}

	const fastest = sorted.find((r) => r.status === "success");
	const current = results.find(
		(r) => r.modelId === "fal-ai/bytedance/seedream/v4.5/edit",
	);
	if (fastest && current && fastest.modelId !== current.modelId) {
		const savedSec = current.durationSec - fastest.durationSec;
		console.log(
			`\n  🏆 Fastest: ${fastest.name} (${fastest.durationSec}s) — ${savedSec.toFixed(1)}s faster than current`,
		);
	}

	// ─── Save results ───────────────────────────────────────────────────────────

	const output = {
		runAt: new Date().toISOString(),
		testPhotoUrl: TEST_PHOTO_URL,
		testPrompt: TEST_PROMPT,
		results,
	};

	writeFileSync(
		"scripts/benchmark-results.json",
		JSON.stringify(output, null, 2),
	);
	console.log("\n  📄 Full results saved to scripts/benchmark-results.json");
	console.log("     Open image URLs above in browser to compare quality.\n");
}

main().catch((err) => {
	console.error("Benchmark failed:", err);
	process.exit(1);
});
