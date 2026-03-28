import { getStyleById } from "../domain/styles";
import { findHeadshotHistory } from "../infrastructure/history.repository";

interface HistoryOptions {
	userId: string;
	page: number;
	limit: number;
}

export async function getGenerationHistory({
	userId,
	page,
	limit,
}: HistoryOptions) {
	const { headshots, pagination } = await findHeadshotHistory({
		userId,
		page,
		limit,
	});

	return {
		headshots: headshots.map((h) => ({
			id: h.id,
			src: h.resultUrl,
			style: getStyleById(h.generationJob.styleId)?.label ?? "Custom",
			createdAt: h.createdAt,
		})),
		pagination,
	};
}
