import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	CheckCircle2,
	Download,
	Heart,
	RotateCcw,
	Sparkles,
	Trash2,
	X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "#/lib/auth-client";
import { StudioStyleSelector } from "#/modules/studio/components/studio-style-selector";
import { StudioUploadZone } from "#/modules/studio/components/studio-upload-zone";
import { useGenerationFlow } from "#/modules/studio/components/use-generation-flow";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/")({
	component: StudioIndexPage,
});

interface GalleryItem {
	id: string;
	src: string;
	style: string;
	styleLabel: string;
	createdAt: string;
	isFavorited: boolean;
	isPending?: boolean;
}

interface TrashItem {
	id: string;
	src: string;
	style: string;
	styleLabel: string;
	createdAt: string;
}

interface Category {
	styleId: string;
	label: string;
}

function StudioIndexPage() {
	const queryClient = useQueryClient();
	const { data: session } = authClient.useSession();

	// View State
	const [activeView, setActiveView] = useState<"gallery" | "trash">("gallery");
	const [activeFilter, setActiveFilter] = useState<string>("All");

	// Generation State
	const [step, setStep] = useState<1 | 2 | 3>(1);
	const [file, setFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
	const [isDockCollapsed, setIsDockCollapsed] = useState(false);

	const { generate } = useGenerationFlow({
		onGenerating: () => {},
		onGeneratedImage: () => {},
		onStep: setStep,
	});

	// Categories Query
	const { data: categoriesData } = useQuery<{ categories: Category[] }>({
		queryKey: ["gallery-categories"],
		queryFn: async () => {
			const res = await fetch("/api/studio/gallery/categories");
			if (!res.ok) throw new Error("Failed to load categories");
			return res.json();
		},
		staleTime: 1000 * 60 * 5,
	});

	const styleId =
		activeFilter !== "All" && activeFilter !== "Favorites"
			? activeFilter
			: undefined;

	// Gallery Query
	const { data: galleryData, isLoading: isGalleryLoading } = useQuery<{
		headshots: GalleryItem[];
	}>({
		queryKey: ["gallery", styleId],
		queryFn: async () => {
			const url = styleId
				? `/api/studio/gallery?style=${styleId}`
				: "/api/studio/gallery";
			const res = await fetch(url);
			if (!res.ok) throw new Error("Failed to load gallery");
			return res.json();
		},
		refetchInterval: (query) => {
			const hasPending = query.state.data?.headshots.some((h) => h.isPending);
			return hasPending ? 3000 : false;
		},
		enabled: activeView === "gallery",
	});

	// Trash Query
	const { data: trashData, isLoading: isTrashLoading } = useQuery<{
		headshots: TrashItem[];
	}>({
		queryKey: ["trash"],
		queryFn: async () => {
			const res = await fetch("/api/studio/trash");
			if (!res.ok) throw new Error("Failed to load trash");
			return res.json();
		},
		enabled: activeView === "trash",
	});

	// Mutations
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
			}>(["gallery", styleId]);
			queryClient.setQueryData<{ headshots: GalleryItem[] }>(
				["gallery", styleId],
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
			queryClient.setQueryData(["gallery", styleId], context?.previousData);
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

	// Handlers
	const handleFileSelected = (selectedFile: File) => {
		setFile(selectedFile);
		setPreviewUrl(URL.createObjectURL(selectedFile));
		setStep(2);
	};

	const handleClear = () => {
		setFile(null);
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		setPreviewUrl(null);
		setStep(1);
	};

	const handleGenerate = async () => {
		if (!file || !selectedStyle) return;
		const currentCredits = session?.user?.currentCredits ?? 0;
		await generate(file, selectedStyle, currentCredits);

		// Auto-reset to Step 1 after starting generation so the user can do another
		toast.info(
			"Generation started! You can start another one while we work on this.",
		);
		handleClear();
	};

	const handleDownload = async (url: string) => {
		try {
			const response = await fetch(url);
			const blob = await response.blob();
			const blobUrl = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = blobUrl;
			link.download = `headshot-${Date.now()}.png`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(blobUrl);
		} catch (e) {
			console.error("Download failed", e);
		}
	};

	const categories = categoriesData?.categories ?? [];
	const filters = ["All", "Favorites", ...categories.map((c) => c.styleId)];
	const getCategoryLabel = (id: string) =>
		categories.find((c) => c.styleId === id)?.label ?? id;

	const allHeadshots = galleryData?.headshots ?? [];
	const displayedGallery =
		activeFilter === "Favorites"
			? allHeadshots.filter((item) => item.isFavorited)
			: allHeadshots;

	const trashItems = trashData?.headshots ?? [];

	return (
		<div className="relative min-h-screen flex flex-col items-center overflow-hidden pb-48">
			{/* Background */}
			<div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
				<div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] opacity-50" />
				<div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px] opacity-30" />
				<div className="absolute inset-0 bg-background/40 backdrop-blur-[2px]" />
			</div>

			<div className="relative z-10 w-full max-w-7xl px-4 md:px-8 pt-8 space-y-12">
				{/* Top Controls */}
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
					<div className="flex flex-col gap-1">
						<h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
							Creative{" "}
							<span className="italic font-light text-muted-foreground">
								Space.
							</span>
						</h2>
						<p className="text-muted-foreground text-sm font-light tracking-wide">
							Generate, manage, and refine your AI headshots.
						</p>
					</div>

					<div className="flex items-center gap-4">
						<div className="glass p-1 rounded-full border border-white/5 flex items-center">
							<button
								type="button"
								onClick={() => setActiveView("gallery")}
								className={cn(
									"px-6 py-2 rounded-full text-xs font-bold tracking-widest uppercase transition-all",
									activeView === "gallery"
										? "bg-white text-black shadow-lg"
										: "text-muted-foreground hover:text-white",
								)}
							>
								Gallery
							</button>
							<button
								type="button"
								onClick={() => setActiveView("trash")}
								className={cn(
									"px-6 py-2 rounded-full text-xs font-bold tracking-widest uppercase transition-all",
									activeView === "trash"
										? "bg-white text-black shadow-lg"
										: "text-muted-foreground hover:text-white",
								)}
							>
								Trash
							</button>
						</div>
					</div>
				</div>

				{/* Main Content Area */}
				<div className="space-y-8">
					{activeView === "gallery" && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-6"
						>
							{filters.map((filter) => (
								<button
									type="button"
									key={filter}
									onClick={() => setActiveFilter(filter)}
									className={cn(
										"px-5 py-2 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all duration-300",
										activeFilter === filter
											? "bg-white text-black shadow-md shadow-white/10"
											: "text-muted-foreground hover:text-white hover:bg-white/5",
									)}
								>
									{filter === "All" || filter === "Favorites"
										? filter
										: getCategoryLabel(filter)}
								</button>
							))}
						</motion.div>
					)}

					{/* Loading State */}
					{isGalleryLoading || isTrashLoading ? (
						<div className="py-32 flex justify-center w-full">
							<motion.div
								animate={{ rotate: 360 }}
								transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
								className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full"
							/>
						</div>
					) : (
						<div className="w-full">
							{activeView === "gallery" ? (
								displayedGallery.length === 0 ? (
									<EmptyState
										title="Gallery is empty"
										description="Generate some stunning headshots to start filling your archive."
									/>
								) : (
									<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
										{displayedGallery.map((item) => (
											<GalleryCard
												key={item.id}
												item={item}
												onFavorite={() => favoriteMutation.mutate(item.id)}
												onDelete={() => moveTrashMutation.mutate(item.id)}
												onDownload={() => handleDownload(item.src)}
											/>
										))}
									</div>
								)
							) : trashItems.length === 0 ? (
								<EmptyState
									title="Trash is empty"
									description="Deleted items will appear here for 30 days before removal."
									icon={<Trash2 className="w-6 h-6" />}
								/>
							) : (
								<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
									{trashItems.map((item) => (
										<TrashCard
											key={item.id}
											item={item}
											onRestore={() => restoreMutation.mutate(item.id)}
											onDelete={() => {
												if (confirm("Permanently delete this image?")) {
													permanentDeleteMutation.mutate(item.id);
												}
											}}
										/>
									))}
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Fixed Bottom Dock Generation */}
			<div
				className={cn(
					"fixed bottom-0 left-0 right-0 z-50 pointer-events-none transition-all duration-500",
					isDockCollapsed ? "px-4 sm:px-6 pb-0" : "p-4 sm:p-6",
				)}
			>
				<div
					className={cn(
						"max-w-4xl mx-auto w-full pointer-events-auto flex flex-col gap-4",
						isDockCollapsed ? "items-center" : "items-end",
					)}
				>
					<AnimatePresence mode="wait">
						{!isDockCollapsed ? (
							<motion.div
								key="expanded-dock"
								initial={{ y: 100, opacity: 0 }}
								animate={{ y: 0, opacity: 1 }}
								className="w-full relative group"
							>
								<div className="flex flex-col gap-5 px-4">
									{/* Top Header Row: Ultra-Minimalist Progress & Close */}
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-8">
											{[
												{ id: 1, label: "Upload" },
												{ id: 2, label: "Choose Style" },
												{ id: 3, label: "Generate" },
											].map((s) => (
												<div key={s.id} className="flex items-center gap-2">
													<div
														className={cn(
															"w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black transition-all",
															step === s.id
																? "bg-primary text-primary-foreground scale-110 shadow-[0_0_10px_rgba(var(--primary),0.5)]"
																: step > s.id
																	? "bg-green-500 text-white"
																	: "bg-white/10 text-muted-foreground/30",
														)}
													>
														{step > s.id ? (
															<CheckCircle2 className="w-3 h-3" />
														) : (
															s.id
														)}
													</div>
													<span
														className={cn(
															"text-[10px] font-black tracking-widest uppercase transition-colors",
															step === s.id
																? "text-white"
																: "text-muted-foreground/30",
														)}
													>
														{s.label}
													</span>
												</div>
											))}
										</div>

										<button
											type="button"
											onClick={() => setIsDockCollapsed(true)}
											className="p-1 text-muted-foreground hover:text-white transition-all group/collapse"
											title="Close"
										>
											<X className="w-5 h-5 group-hover/collapse:rotate-90 transition-transform" />
										</button>
									</div>

									{/* Content Area */}
									<div className="w-full min-h-[70px] flex items-center overflow-hidden">
										<AnimatePresence mode="wait">
											{step === 1 && (
												<motion.div
													key="step1"
													className="w-full"
													initial={{ opacity: 0, y: 10 }}
													animate={{ opacity: 1, y: 0 }}
													exit={{ opacity: 0, y: 10 }}
												>
													<StudioUploadZone
														onFileSelected={handleFileSelected}
													/>
												</motion.div>
											)}
											{step === 2 && previewUrl && (
												<motion.div
													key="step2"
													className="w-full"
													initial={{ opacity: 0, y: 10 }}
													animate={{ opacity: 1, y: 0 }}
													exit={{ opacity: 0, y: 10 }}
												>
													<StudioStyleSelector
														previewUrl={previewUrl}
														selectedStyle={selectedStyle}
														onStyleSelect={setSelectedStyle}
														onClear={handleClear}
														onGenerate={handleGenerate}
													/>
												</motion.div>
											)}
											{step === 3 && (
												<motion.div
													key="step3"
													className="w-full"
													initial={{ opacity: 0, scale: 0.98 }}
													animate={{ opacity: 1, scale: 1 }}
													exit={{ opacity: 0, scale: 0.98 }}
												>
													<div className="flex items-center justify-center gap-4 py-4 text-primary w-full">
														<motion.div
															animate={{ rotate: 360 }}
															transition={{
																repeat: Infinity,
																duration: 2,
																ease: "linear",
															}}
															className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
														/>
														<span className="text-xs font-bold uppercase tracking-widest animate-pulse">
															Neural Submission...
														</span>
													</div>
												</motion.div>
											)}
										</AnimatePresence>
									</div>
								</div>
							</motion.div>
						) : (
							<motion.button
								key="collapsed-handle"
								layoutId="dock"
								initial={{ y: 40, opacity: 0 }}
								animate={{ y: 8, opacity: 1 }} // Slight offset for 'shelf' look
								whileHover={{ y: 4, scale: 1.02 }}
								exit={{ y: 40, opacity: 0 }}
								onClick={() => setIsDockCollapsed(false)}
								className="glass w-64 h-12 rounded-t-3xl border-x border-t border-white/10 shadow-2xl flex items-center justify-center gap-3 group cursor-pointer relative"
							>
								{/* Subtle handle line */}
								<div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-white/10 group-hover:bg-primary/40 transition-colors" />

								<Sparkles className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
								<span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70 group-hover:text-white transition-colors">
									New Generation
								</span>
							</motion.button>
						)}
					</AnimatePresence>
				</div>
			</div>
		</div>
	);
}

function GalleryCard({
	item,
	onFavorite,
	onDelete,
	onDownload,
}: {
	item: GalleryItem;
	onFavorite: () => void;
	onDelete: () => void;
	onDownload: () => void;
}) {
	if (item.isPending) {
		return (
			<motion.div
				layout
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				className="relative aspect-3/4 rounded-2xl overflow-hidden glass border border-primary/20 bg-primary/5"
			>
				<div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
					<motion.div
						animate={{ rotate: 360 }}
						transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
						className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
					/>
					<span className="text-[10px] font-bold uppercase tracking-widest text-primary animate-pulse">
						Neural Crafting...
					</span>
				</div>
			</motion.div>
		);
	}

	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4 }}
			className="group relative aspect-3/4 rounded-2xl overflow-hidden glass border border-white/10"
		>
			<img
				src={item.src}
				alt=""
				className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
			/>
			<div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

			<div className="absolute inset-0 p-4 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
				<div className="flex justify-between items-start">
					<span className="px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[8px] font-bold uppercase tracking-widest text-white/90">
						{item.styleLabel || item.style}
					</span>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={onFavorite}
							className={cn(
								"w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 transition-colors",
								item.isFavorited
									? "bg-red-500/40 text-red-500"
									: "bg-black/40 text-white hover:bg-white/20",
							)}
						>
							<Heart
								className="w-3.5 h-3.5"
								fill={item.isFavorited ? "currentColor" : "none"}
							/>
						</button>
						<button
							type="button"
							onClick={onDelete}
							className="w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 bg-black/40 text-white hover:bg-red-500 transition-colors"
						>
							<Trash2 className="w-3.5 h-3.5" />
						</button>
					</div>
				</div>
				<Button
					onClick={onDownload}
					variant="secondary"
					className="w-full h-9 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-none ring-0"
				>
					<Download className="w-3.5 h-3.5 mr-2" /> Download
				</Button>
			</div>
		</motion.div>
	);
}

function TrashCard({
	item,
	onRestore,
	onDelete,
}: {
	item: TrashItem;
	onRestore: () => void;
	onDelete: () => void;
}) {
	return (
		<motion.div
			layout
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			className="group relative aspect-3/4 rounded-2xl overflow-hidden glass border border-white/10"
		>
			<img
				src={item.src}
				alt=""
				className="w-full h-full object-cover opacity-50 grayscale transition-all group-hover:opacity-80 group-hover:grayscale-0"
			/>
			<div className="absolute inset-x-0 bottom-0 p-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
				<Button
					onClick={onRestore}
					size="sm"
					className="flex-1 h-8 rounded-lg text-[9px] font-bold uppercase border-white/10 bg-white/20 hover:bg-white/30"
				>
					<RotateCcw className="w-3 h-3 mr-1.5" /> Restore
				</Button>
				<button
					type="button"
					onClick={onDelete}
					className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/20 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-colors"
				>
					<Trash2 className="w-3.5 h-3.5" />
				</button>
			</div>
		</motion.div>
	);
}

function EmptyState({
	title,
	description,
	icon = <Sparkles className="w-6 h-6" />,
}: {
	title: string;
	description: string;
	icon?: React.ReactNode;
}) {
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			className="py-24 flex flex-col items-center justify-center text-center space-y-4"
		>
			<div className="w-16 h-16 rounded-full glass border border-white/10 flex items-center justify-center mb-2 text-muted-foreground">
				{icon}
			</div>
			<h3 className="text-xl font-display font-bold">{title}</h3>
			<p className="text-muted-foreground font-light max-w-xs text-sm">
				{description}
			</p>
		</motion.div>
	);
}
