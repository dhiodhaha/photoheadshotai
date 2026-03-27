import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	CheckCircle2,
	Download,
	Heart,
	LayoutGrid,
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
import { HEADSHOT_STYLES } from "#/modules/studio/domain/styles";
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

function StudioIndexPage() {
	const queryClient = useQueryClient();
	const { data: session } = authClient.useSession();

	// View State
	const [activeView, setActiveView] = useState<"gallery" | "trash">("gallery");

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

	// Gallery Query
	const { data: galleryData } = useQuery<{
		headshots: GalleryItem[];
	}>({
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

	// Trash Query
	const { data: trashData } = useQuery<{
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

		// Auto-reset to Step 1 after a delay to allow the animation to finish
		setTimeout(() => {
			toast.info(
				"Generation started! You can start another one while we work on this.",
			);
			handleClear();
		}, 3000);
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

	const displayedGallery = galleryData?.headshots ?? [];
	const trashItems = trashData?.headshots ?? [];

	return (
		<div className="relative min-h-screen flex flex-col items-center overflow-hidden pb-48">
			{/* Background */}
			<div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
				<div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] opacity-50" />
				<div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px] opacity-30" />
				<div className="absolute inset-0 bg-background/40 backdrop-blur-[2px]" />
			</div>

			<div className="relative z-10 w-full px-4 md:px-12 lg:px-24 pt-8 md:pt-12">
				{/* Floating Navigator Sidebar */}
				<div className="fixed left-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-40">
					<div className="glass p-2 rounded-2xl border border-white/10 flex flex-col items-center gap-3 shadow-2xl">
						<button
							type="button"
							onClick={() => setActiveView("gallery")}
							className={cn(
								"w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
								activeView === "gallery"
									? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]"
									: "text-white/40 hover:text-white hover:bg-white/5",
							)}
							title="Gallery"
						>
							<LayoutGrid className="w-5 h-5" />
						</button>
						<button
							type="button"
							onClick={() => setActiveView("trash")}
							className={cn(
								"w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
								activeView === "trash"
									? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]"
									: "text-white/40 hover:text-white hover:bg-white/5",
							)}
							title="Trash"
						>
							<Trash2 className="w-5 h-5" />
						</button>
					</div>
				</div>

				<div className="w-full">
					{activeView === "gallery" ? (
						displayedGallery.length === 0 ? (
							<EmptyState
								title="Gallery is empty"
								description="Generate some stunning headshots to start filling your archive."
							/>
						) : (
							<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-8 gap-4 md:gap-6">
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
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-8 gap-4 md:gap-6">
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
						"max-w-4xl mx-auto w-full pointer-events-auto flex flex-col gap-4 items-center",
					)}
				>
					<AnimatePresence mode="wait">
						{!isDockCollapsed ? (
							<motion.div
								key="expanded-dock"
								initial={{ opacity: 0, y: 40 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: 40 }}
								transition={{
									type: "spring",
									stiffness: 400,
									damping: 30,
								}}
								className="w-full glass rounded-[24px] border border-white/10 shadow-2xl backdrop-blur-xl p-4 mb-4"
							>
								<div className="max-w-4xl mx-auto">
									<AnimatePresence mode="wait">
										{step !== 3 ? (
											<motion.div
												key="standard-layout"
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												exit={{ opacity: 0, scale: 0.98, filter: "blur(10px)" }}
												transition={{ duration: 0.4 }}
												className="flex flex-col gap-4"
											>
												{/* Top Header Row: Unified Island Header */}
												<div className="flex items-center justify-between h-8">
													<div className="flex items-center gap-8">
														{[
															{ id: 1, label: "Upload" },
															{ id: 2, label: "Choose Style" },
															{ id: 3, label: "Generate" },
														].map((s) => (
															<div
																key={s.id}
																className="flex items-center gap-2.5"
															>
																<div
																	className={cn(
																		"w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black transition-all duration-300",
																		step === s.id
																			? "bg-primary text-primary-foreground scale-110 shadow-[0_0_15px_rgba(var(--primary),0.4)]"
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
																		"text-[10px] font-black tracking-[0.2em] uppercase transition-colors duration-300",
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

													<motion.button
														type="button"
														whileHover={{ scale: 1.05 }}
														whileTap={{ scale: 0.95 }}
														onClick={() => setIsDockCollapsed(true)}
														className="p-1.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-all group/collapse"
														title="Close"
													>
														<X className="w-4 h-4 group-hover/collapse:rotate-90 transition-transform" />
													</motion.button>
												</div>

												{/* Content Area */}
												<div className="w-full flex items-center">
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
													</AnimatePresence>
												</div>

												{/* Bottom Footer */}
												<div className="flex items-center justify-between pt-1">
													<span className="text-[9.5px] font-black uppercase tracking-[0.2em] text-white/40">
														Secure & Private
													</span>
													<div className="flex items-center gap-2">
														<div className="w-1 h-1 rounded-full bg-green-500/60 animate-pulse" />
														<span className="text-[9.5px] font-black uppercase tracking-[0.2em] text-white/40">
															Photos Automatically Deleted
														</span>
													</div>
												</div>
											</motion.div>
										) : (
											<motion.div
												key="synthesis-layout"
												initial={{
													opacity: 0,
													scale: 0.95,
													filter: "blur(10px)",
												}}
												animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
												className="w-full h-[180px] flex flex-col items-center justify-center relative overflow-hidden"
											>
												{/* Full-width Ambient Effects */}
												<div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[20px]">
													<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-primary/10 rounded-full blur-[120px] opacity-40 animate-pulse" />

													{/* Global Cinematic Woosh */}
													<motion.div
														initial={{ x: "-120%", opacity: 0 }}
														animate={{ x: "120%", opacity: [0, 1, 1, 0] }}
														transition={{
															delay: 0.5,
															duration: 0.9,
															repeat: Infinity,
															repeatDelay: 1.5,
															ease: "easeInOut",
														}}
														className="absolute inset-y-0 w-[500px] bg-linear-to-r from-transparent via-white/40 to-transparent skew-x-[-35deg] blur-md z-30"
													/>
												</div>

												<div className="flex flex-col items-center gap-6 relative z-10 w-full">
													{/* Monumental Photo Synthesis */}
													<div className="flex items-center gap-24 relative h-20 w-full justify-center">
														<motion.div
															initial={{ x: -200, opacity: 0, scale: 0.5 }}
															animate={{ x: -40, opacity: 1, scale: 1 }}
															transition={{
																duration: 1.5,
																ease: [0.16, 1, 0.3, 1],
															}}
															className="w-20 h-20 rounded-full border-2 border-white/20 overflow-hidden glass shadow-[0_0_50px_rgba(255,255,255,0.1)] z-20"
														>
															<img
																src={previewUrl || ""}
																alt="Source"
																className="w-full h-full object-cover"
															/>
														</motion.div>

														<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
															<motion.div
																animate={{ rotate: -360 }}
																transition={{
																	repeat: Infinity,
																	duration: 12,
																	ease: "linear",
																}}
																className="w-44 h-44 rounded-full border border-dashed border-primary/20 opacity-30"
															/>
															<motion.div
																animate={{
																	scale: [1, 1.5, 1],
																	opacity: [0.3, 0.6, 0.3],
																}}
																transition={{ repeat: Infinity, duration: 3 }}
																className="absolute inset-0 flex items-center justify-center"
															>
																<div className="w-32 h-32 rounded-full bg-primary/20 blur-3xl shadow-[0_0_120px_rgba(var(--primary),0.4)]" />
															</motion.div>
														</div>

														<motion.div
															initial={{ x: 200, opacity: 0, scale: 0.5 }}
															animate={{
																x: 40,
																opacity: 1,
																scale: 1,
																boxShadow: [
																	"0 0 0px rgba(var(--primary),0)",
																	"0 0 40px rgba(var(--primary),0.3)",
																	"0 0 0px rgba(var(--primary),0)",
																],
															}}
															transition={{
																duration: 1.5,
																ease: [0.16, 1, 0.3, 1],
																boxShadow: {
																	delay: 1,
																	duration: 2,
																	repeat: Infinity,
																},
															}}
															className="w-20 h-20 rounded-full border-2 border-primary/40 overflow-hidden glass shadow-[0_0_50px_rgba(var(--primary),0.2)] z-20"
														>
															<img
																src={
																	HEADSHOT_STYLES.find(
																		(s) => s.id === (selectedStyle || ""),
																	)?.image || ""
																}
																alt="Style"
																className="w-full h-full object-cover"
															/>
														</motion.div>
													</div>

													<motion.div
														initial={{ opacity: 0, y: 20 }}
														animate={{ opacity: 1, y: 0 }}
														transition={{ delay: 1.4 }}
														className="text-center space-y-2"
													>
														<p className="text-sm font-black uppercase tracking-[0.5em] text-primary drop-shadow-[0_0_10px_rgba(var(--primary),0.5)]">
															Neural Synthesis
														</p>
														<p className="text-[10px] font-medium text-white/40 uppercase tracking-[0.3em]">
															Merging Reference & Style in the cloud
														</p>
													</motion.div>
												</div>

												{/* Integrated Close during synthesis */}
												<motion.button
													initial={{ opacity: 0 }}
													animate={{ opacity: 1 }}
													transition={{ delay: 2 }}
													onClick={() => setIsDockCollapsed(true)}
													className="absolute top-0 right-0 p-2 text-white/20 hover:text-white transition-colors z-30"
												>
													<X className="w-5 h-5" />
												</motion.button>
											</motion.div>
										)}
									</AnimatePresence>
								</div>
							</motion.div>
						) : (
							<motion.button
								key="collapsed-dock"
								initial={{ opacity: 0, y: 20, scale: 0.95 }}
								animate={{ opacity: 1, y: 0, scale: 1 }}
								exit={{ opacity: 0, y: 20, scale: 0.95 }}
								whileHover={{ y: -4, scale: 1.02 }}
								onClick={() => setIsDockCollapsed(false)}
								className="glass min-w-[300px] h-12 rounded-[20px] border border-white/10 shadow-2xl flex items-center justify-center gap-6 px-8 group cursor-pointer relative mb-4"
							>
								<div className="flex items-center gap-3">
									<Sparkles className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
									<span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">
										New Generation
									</span>
								</div>

								<div className="w-px h-4 bg-white/10" />

								<span className="text-[9px] font-bold uppercase tracking-widest text-white/30 group-hover:text-white/50 transition-colors">
									Safe & Secure
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
