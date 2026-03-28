import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { GalleryItem } from "../domain/headshot.types";

export function useStudioMutations() {
	const queryClient = useQueryClient();

	const favoriteMutation = useMutation({
		mutationFn: async (headshotId: string) => {
			const res = await fetch("/api/studio/gallery", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "favorite", headshotId }),
			});
			if (!res.ok) throw new Error("Failed to toggle favorite");
			return res.json();
		},
		onMutate: async (headshotId) => {
			await queryClient.cancelQueries({ queryKey: ["gallery"] });
			const previousData = queryClient.getQueryData<{
				headshots: GalleryItem[];
			}>(["gallery"]);
			queryClient.setQueryData<{ headshots: GalleryItem[] }>(
				["gallery"],
				(old) => {
					if (!old) return old;
					return {
						headshots: old.headshots.map((h) =>
							h.id === headshotId ? { ...h, isFavorited: !h.isFavorited } : h,
						),
					};
				},
			);
			return { previousData };
		},
		onError: (_err, _vars, context) => {
			queryClient.setQueryData(["gallery"], context?.previousData);
			toast.error("Failed to update favorite.");
		},
	});

	const moveTrashMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch("/api/studio/gallery", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id }),
			});
			if (!res.ok) throw new Error("Delete failed");
			return res.json();
		},
		onSuccess: () => {
			toast.success("Image moved to trash.");
			queryClient.invalidateQueries({ queryKey: ["gallery"] });
			queryClient.invalidateQueries({ queryKey: ["trash"] });
		},
	});

	const restoreMutation = useMutation({
		mutationFn: async (headshotId: string) => {
			const res = await fetch("/api/studio/trash/restore", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ headshotId }),
			});
			if (!res.ok) throw new Error("Restore failed");
			return res.json();
		},
		onSuccess: () => {
			toast.success("Image restored to gallery.");
			queryClient.invalidateQueries({ queryKey: ["trash"] });
			queryClient.invalidateQueries({ queryKey: ["gallery"] });
		},
	});

	const permanentDeleteMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/api/studio/trash/${id}`, { method: "DELETE" });
			if (!res.ok) throw new Error("Delete failed");
			return res.json();
		},
		onSuccess: () => {
			toast.success("Image permanently deleted.");
			queryClient.invalidateQueries({ queryKey: ["trash"] });
		},
	});

	return {
		favoriteMutation,
		moveTrashMutation,
		restoreMutation,
		permanentDeleteMutation,
	};
}
