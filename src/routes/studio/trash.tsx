import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/studio/trash")({
	component: TrashPage,
});

interface TrashItem {
	id: string;
	src: string;
	style: string;
	styleLabel: string;
	createdAt: string;
}

function TrashPage() {
	const queryClient = useQueryClient();

	const { data, isLoading } = useQuery<{ headshots: TrashItem[] }>({
		queryKey: ["trash"],
		queryFn: async () => {
			const res = await fetch("/api/studio/trash");
			if (!res.ok) throw new Error("Failed to load trash");
			return res.json();
		},
	});

	const items = data?.headshots ?? [];

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
		onError: (error: unknown) => {
			toast.error(error instanceof Error ? error.message : "Restore failed.");
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/api/studio/trash/${id}`, {
				method: "DELETE",
			});
			if (!res.ok) throw new Error("Delete failed");
			return res.json();
		},
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: ["trash"] });
			const prev = queryClient.getQueryData<{ headshots: TrashItem[] }>([
				"trash",
			]);
			queryClient.setQueryData<{ headshots: TrashItem[] }>(["trash"], (old) => {
				if (!old) return old;
				return { headshots: old.headshots.filter((h) => h.id !== id) };
			});
			return { prev };
		},
		onSuccess: () => toast.success("Image permanently deleted."),
		onError: (_err, _vars, context) => {
			queryClient.setQueryData(["trash"], context?.prev);
			toast.error("Failed to delete image.");
		},
	});

	return (
		<div className="relative min-h-[calc(100vh-5rem)] p-6 md:p-12 overflow-y-auto">
			<div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-red-500/5 rounded-full blur-[150px] pointer-events-none opacity-50" />

			<div className="max-w-7xl mx-auto relative z-10 space-y-12">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8 }}
					className="space-y-4"
				>
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-white/10 text-[10px] font-bold tracking-widest uppercase mb-2 text-muted-foreground">
						<Trash2 className="w-3 h-3 text-red-500" />
						Recycle Bin
					</div>
					<h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight leading-none">
						Trash{" "}
						<span className="italic font-light text-muted-foreground">
							& Recovery.
						</span>
					</h1>
					<p className="text-muted-foreground max-w-xl text-lg font-light tracking-wide">
						Deleted headshots are kept here. Restore or permanently remove them.
					</p>
				</motion.div>

				{isLoading ? (
					<div className="py-32 flex justify-center">
						<motion.div
							animate={{ rotate: 360 }}
							transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
							className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full"
						/>
					</div>
				) : items.length === 0 ? (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="py-32 flex flex-col items-center justify-center text-center space-y-4"
					>
						<div className="w-16 h-16 rounded-full glass border border-white/10 flex items-center justify-center mb-4">
							<Sparkles className="w-6 h-6 text-muted-foreground" />
						</div>
						<h3 className="text-xl font-display font-bold">Trash is empty</h3>
						<p className="text-muted-foreground font-light max-w-xs">
							Deleted headshots will appear here before permanent removal.
						</p>
					</motion.div>
				) : (
					<motion.div
						layout
						className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
					>
						{items.map((item, i) => (
							<motion.div
								layout
								initial={{ opacity: 0, scale: 0.9 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.9 }}
								transition={{ duration: 0.4, delay: i * 0.05 }}
								key={item.id}
								className="group relative aspect-3/4 rounded-2xl overflow-hidden glass border border-white/10 shadow-xl"
							>
								<img
									src={item.src}
									alt={`Deleted Portrait ${item.id}`}
									className="w-full h-full object-cover opacity-60 transition-opacity duration-300 group-hover:opacity-80"
								/>

								<div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

								<div className="absolute inset-0 p-4 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
									<div className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-[9px] font-bold uppercase tracking-widest text-white/80 self-start">
										{item.styleLabel || item.style}
									</div>

									<div className="flex gap-2">
										<Button
											onClick={() => restoreMutation.mutate(item.id)}
											disabled={restoreMutation.isPending}
											className="flex-1 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/20 text-white font-bold tracking-widest text-xs uppercase shadow-none ring-0"
										>
											<RotateCcw className="w-3 h-3 mr-1" />
											Restore
										</Button>
										<button
											type="button"
											onClick={() => {
												if (
													confirm(
														"Permanently delete this image? This cannot be undone.",
													)
												) {
													deleteMutation.mutate(item.id);
												}
											}}
											disabled={deleteMutation.isPending}
											className="w-9 h-9 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/10 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
											aria-label="Permanently delete"
										>
											<Trash2 className="w-4 h-4" />
										</button>
									</div>
								</div>
							</motion.div>
						))}
					</motion.div>
				)}
			</div>
		</div>
	);
}
