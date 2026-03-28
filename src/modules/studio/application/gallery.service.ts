import { HEADSHOT_STYLES } from "../domain/styles";
import {
	findActiveJobsByUser,
	findDistinctStylesByUser,
	findHeadshotOwned,
	findHeadshotsByUser,
	softDeleteHeadshot,
} from "../infrastructure/gallery.repository";

function resolveStyleLabel(styleId: string): string {
	return HEADSHOT_STYLES.find((s) => s.id === styleId)?.label ?? styleId;
}

export async function getHeadshotGallery(userId: string, styleId?: string) {
	// When filtering by style, pending jobs don't have a confirmed style yet — skip them
	const [headshots, pendingJobs] = await Promise.all([
		findHeadshotsByUser(userId, styleId),
		styleId ? Promise.resolve([]) : findActiveJobsByUser(userId),
	]);

	const pendingItems = pendingJobs.map((job) => ({
		id: `pending_${job.id}`,
		src: "",
		style: "",
		styleLabel: "",
		createdAt: new Date(),
		isFavorited: false,
		isPending: true,
	}));

	const completedItems = headshots.map((h) => ({
		id: h.id,
		src: h.resultUrl,
		thumbnail: h.thumbnailUrl ?? h.resultUrl,
		style: h.generationJob.styleId,
		styleLabel: resolveStyleLabel(h.generationJob.styleId),
		createdAt: h.createdAt,
		isFavorited: h.favorites.length > 0,
		isPending: false,
	}));

	return [...pendingItems, ...completedItems];
}

export async function getGalleryCategories(userId: string) {
	const jobs = await findDistinctStylesByUser(userId);

	return jobs.map((j) => ({
		styleId: j.styleId,
		label: resolveStyleLabel(j.styleId),
	}));
}

export async function deleteHeadshot(headshotId: string, userId: string) {
	const headshot = await findHeadshotOwned(headshotId, userId);

	if (!headshot) {
		throw new Error("Not found or unauthorized");
	}

	await softDeleteHeadshot(headshotId);
}
