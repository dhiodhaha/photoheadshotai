import { HEADSHOT_STYLES } from "../domain/styles";
import {
	findFavoritesByUser,
	toggleFavoriteAtomic,
} from "../infrastructure/gallery.repository";

function resolveStyleLabel(styleId: string): string {
	return HEADSHOT_STYLES.find((s) => s.id === styleId)?.label ?? styleId;
}

export async function toggleFavorite(userId: string, headshotId: string) {
	return toggleFavoriteAtomic(userId, headshotId);
}

export async function getFavorites(userId: string) {
	const favorites = await findFavoritesByUser(userId);

	return favorites.map((f) => ({
		id: f.headshot.id,
		src: f.headshot.resultUrl,
		thumbnail: f.headshot.thumbnailUrl ?? f.headshot.resultUrl,
		style: f.headshot.generationJob.styleId,
		styleLabel: resolveStyleLabel(f.headshot.generationJob.styleId),
		createdAt: f.headshot.createdAt,
		isFavorited: true,
	}));
}
