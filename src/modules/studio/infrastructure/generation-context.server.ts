import { getPresignedUrl } from "./r2.server";

const MOCK_PHOTO_URL =
	"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1024&q=80";

export function isMockR2(): boolean {
	return process.env.R2_ACCOUNT_ID === "placeholder_account_id";
}

export function isMockAiGeneration(): boolean {
	return process.env.MOCK_AI_GENERATION === "true";
}

export function getFalKey(): string {
	const key = process.env.FAL_KEY;
	if (!key) {
		throw new Error("FAL_KEY environment variable is not set.");
	}
	return key;
}

export async function getPhotoUrlForGeneration(
	photoKey: string,
): Promise<string> {
	if (isMockR2()) {
		return MOCK_PHOTO_URL;
	}
	return getPresignedUrl(photoKey);
}
