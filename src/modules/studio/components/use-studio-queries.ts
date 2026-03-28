import { useQuery } from "@tanstack/react-query";
import type { GalleryItem, TrashItem } from "../domain/headshot.types";

export function useStudioQueries(activeView: "gallery" | "trash") {
	const galleryQuery = useQuery<{ headshots: GalleryItem[] }>({
		queryKey: ["gallery"],
		queryFn: async () => {
			const res = await fetch("/api/studio/gallery");
			if (!res.ok) throw new Error("Failed to load gallery");
			return res.json();
		},
		refetchInterval: (query) => {
			const hasPending = query.state.data?.headshots.some((h) => h.isPending);
			return hasPending ? 3000 : false;
		},
		enabled: activeView === "gallery",
	});

	const trashQuery = useQuery<{ headshots: TrashItem[] }>({
		queryKey: ["trash"],
		queryFn: async () => {
			const res = await fetch("/api/studio/trash");
			if (!res.ok) throw new Error("Failed to load trash");
			return res.json();
		},
		enabled: activeView === "trash",
	});

	return {
		gallery: galleryQuery.data?.headshots ?? [],
		trash: trashQuery.data?.headshots ?? [],
	};
}
