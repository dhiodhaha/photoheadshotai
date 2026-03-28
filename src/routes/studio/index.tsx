import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, LayoutGrid, Sparkles, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { authClient } from "#/lib/auth-client";
import { GalleryCard } from "#/modules/studio/components/gallery-card";
import { StudioEmptyState } from "#/modules/studio/components/studio-empty-state";
import { StudioStyleSelector } from "#/modules/studio/components/studio-style-selector";
import { StudioUploadZone } from "#/modules/studio/components/studio-upload-zone";
import { TrashCard } from "#/modules/studio/components/trash-card";
import { useGenerationFlow } from "#/modules/studio/components/use-generation-flow";
import { useStudioMutations } from "#/modules/studio/components/use-studio-mutations";
import { useStudioQueries } from "#/modules/studio/components/use-studio-queries";
import { HEADSHOT_STYLES } from "#/modules/studio/domain/styles";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/")({
	component: StudioIndexPage,
});

function StudioIndexPage() {
	const { data: session } = authClient.useSession();

	// View state
	const [activeView, setActiveView] = useState<"gallery" | "trash">("gallery");

	// Generation dock state
	const [step, setStep] = useState<1 | 2 | 3>(1);
	const [file, setFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
	const [isDockCollapsed, setIsDockCollapsed] = useState(false);

	const { gallery, trash } = useStudioQueries(activeView);
	const {
		favoriteMutation,
		moveTrashMutation,
		restoreMutation,
		permanentDeleteMutation,
	} = useStudioMutations();
	const { generate } = useGenerationFlow({ onStep: setStep });

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
		// currentCredits is an additionalField in auth.ts — typed at runtime but
		// Better Auth's TS inference doesn't surface it on the base User type
		const currentCredits =
			(session?.user as Record<string, unknown>)?.currentCredits ?? 0;
		const credits = typeof currentCredits === "number" ? currentCredits : 0;
		await generate(file, selectedStyle, credits);
		setTimeout(handleClear, 3000);
	};

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
						gallery.length === 0 ? (
							<StudioEmptyState
								title="Gallery is empty"
								description="Generate some stunning headshots to start filling your archive."
							/>
						) : (
							<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-8 gap-4 md:gap-6">
								{gallery.map((item) => (
									<GalleryCard
										key={item.id}
										item={item}
										onFavorite={() => favoriteMutation.mutate(item.id)}
										onDelete={() => moveTrashMutation.mutate(item.id)}
										onDownload={() =>
											import("#/modules/studio/application/download.util").then(
												({ downloadHeadshot }) => downloadHeadshot(item.src),
											)
										}
									/>
								))}
							</div>
						)
					) : trash.length === 0 ? (
						<StudioEmptyState
							title="Trash is empty"
							description="Deleted items will appear here for 30 days before removal."
							icon={<Trash2 className="w-6 h-6" />}
						/>
					) : (
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-8 gap-4 md:gap-6">
							{trash.map((item) => (
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

			{/* Fixed Bottom Dock */}
			<StudioGenerationDock
				step={step}
				isDockCollapsed={isDockCollapsed}
				previewUrl={previewUrl}
				selectedStyle={selectedStyle}
				onCollapse={() => setIsDockCollapsed(true)}
				onExpand={() => setIsDockCollapsed(false)}
				onFileSelected={handleFileSelected}
				onStyleSelect={setSelectedStyle}
				onClear={handleClear}
				onGenerate={handleGenerate}
			/>
		</div>
	);
}

interface DockProps {
	step: 1 | 2 | 3;
	isDockCollapsed: boolean;
	previewUrl: string | null;
	selectedStyle: string | null;
	onCollapse: () => void;
	onExpand: () => void;
	onFileSelected: (file: File) => void;
	onStyleSelect: (style: string) => void;
	onClear: () => void;
	onGenerate: () => void;
}

const DOCK_STEPS = [
	{ id: 1, label: "Upload" },
	{ id: 2, label: "Choose Style" },
	{ id: 3, label: "Generate" },
] as const;

function StudioGenerationDock({
	step,
	isDockCollapsed,
	previewUrl,
	selectedStyle,
	onCollapse,
	onExpand,
	onFileSelected,
	onStyleSelect,
	onClear,
	onGenerate,
}: DockProps) {
	return (
		<div
			className={cn(
				"fixed bottom-0 left-0 right-0 z-50 pointer-events-none transition-all duration-500",
				isDockCollapsed ? "px-4 sm:px-6 pb-0" : "p-4 sm:p-6",
			)}
		>
			<div className="max-w-4xl mx-auto w-full pointer-events-auto flex flex-col gap-4 items-center">
				<AnimatePresence mode="wait">
					{!isDockCollapsed ? (
						<motion.div
							key="expanded-dock"
							initial={{ opacity: 0, y: 40 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 40 }}
							transition={{ type: "spring", stiffness: 400, damping: 30 }}
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
											{/* Steps header */}
											<div className="flex items-center justify-between h-8">
												<div className="flex items-center gap-8">
													{DOCK_STEPS.map((s) => (
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
													onClick={onCollapse}
													className="p-1.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-all group/collapse"
												>
													<X className="w-4 h-4 group-hover/collapse:rotate-90 transition-transform" />
												</motion.button>
											</div>

											{/* Content */}
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
																onFileSelected={onFileSelected}
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
																onStyleSelect={onStyleSelect}
																onClear={onClear}
																onGenerate={onGenerate}
															/>
														</motion.div>
													)}
												</AnimatePresence>
											</div>

											{/* Footer */}
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
											{/* Ambient effects */}
											<div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[20px]">
												<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-primary/10 rounded-full blur-[120px] opacity-40 animate-pulse" />
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

											<motion.button
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												transition={{ delay: 2 }}
												onClick={onCollapse}
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
							onClick={onExpand}
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
	);
}
