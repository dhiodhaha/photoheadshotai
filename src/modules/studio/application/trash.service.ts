import { HEADSHOT_STYLES } from "../domain/styles";
import {
	findDeletedHeadshotOwned,
	findDeletedHeadshotsByUser,
	hardDeleteHeadshot,
	restoreHeadshotById,
} from "../infrastructure/gallery.repository";
import { deletePersistedImage } from "../infrastructure/photo.storage";

function resolveStyleLabel(styleId: string): string {
	return HEADSHOT_STYLES.find((s) => s.id === styleId)?.label ?? styleId;
}

export async function getTrash(userId: string) {
	const headshots = await findDeletedHeadshotsByUser(userId);

	return headshots.map((h) => ({
		id: h.id,
		src: h.resultUrl,
		thumbnail: h.thumbnailUrl ?? h.resultUrl,
		style: h.generationJob.styleId,
		styleLabel: resolveStyleLabel(h.generationJob.styleId),
		createdAt: h.createdAt,
	}));
}

export async function restoreHeadshot(headshotId: string, userId: string) {
	const headshot = await findDeletedHeadshotOwned(headshotId, userId);

	if (!headshot) {
		throw new Error("Not found or unauthorized");
	}

	await restoreHeadshotById(headshotId);
}

export async function permanentlyDeleteHeadshot(
	headshotId: string,
	userId: string,
) {
	const headshot = await findDeletedHeadshotOwned(headshotId, userId);

	if (!headshot) {
		throw new Error("Not found or unauthorized");
	}

	// Delete R2 objects (original + thumbnail)
	// Uses best-effort approach — ignores errors to ensure DB cleanup happens
	try {
		await deletePersistedImage(headshot.r2Key, headshot.r2ThumbnailKey);
	} catch (_e) {
		// Best-effort R2 delete — still remove from DB
	}

	await hardDeleteHeadshot(headshotId);
}
