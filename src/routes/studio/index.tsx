import { createFileRoute } from "@tanstack/react-router";
import {
	Camera,
	CheckCircle2,
	Download,
	ImageIcon,
	Info,
	Loader2,
	ShieldCheck,
	Sparkles,
	Upload,
	X,
	Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { authClient } from "#/lib/auth-client";
import { HEADSHOT_STYLES } from "#/modules/studio";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/")({
	component: StudioIndexPage,
});

function StudioIndexPage() {
	const { data: session, refetch } = authClient.useSession();
	const [step, setStep] = useState<1 | 2 | 3>(1);
	const [file, setFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
	const [isGenerating, setIsGenerating] = useState(false);
	const [generatedImage, setGeneratedImage] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

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
			toast.error("Failed to download image.");
		}
	};

	const handleGenerate = async () => {
		if (!file || !selectedStyle) return;

		// Check credits
		const currentCredits = session?.user?.currentCredits ?? 0;
		if (currentCredits < 10) {
			toast.error(
				"Insufficient credits. Please top up in the Billing section.",
			);
			return;
		}

		setStep(3);
		setIsGenerating(true);

		try {
			const formData = new FormData();
			formData.append("file", file);

			const res = await fetch("/api/studio/upload", {
				method: "POST",
				body: formData,
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || "Failed to upload image.");
			}

			const uploadData = await res.json();
			const { image_id } = uploadData;
			toast.info("Image secured. Prompting AI Generator...");

			// 🔥 REAL AI GENERATION CALL
			const generateRes = await fetch("/api/studio/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					image_id: image_id,
					style: selectedStyle,
				}),
			});

			if (!generateRes.ok) {
				const err = await generateRes.json();
				throw new Error(err.error || "Failed to generate headshots.");
			}

			// Refetch session to update credits
			await refetch();

			const generationData = await generateRes.json();

			if (generationData.image_url) {
				setGeneratedImage(generationData.image_url);
			}

			setIsGenerating(false);
			toast.success("Generation Complete!");
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : "Something went wrong.");
			setIsGenerating(false);
			setStep(2);
		}
	};

	const handleFile = (selectedFile: File) => {
		if (!selectedFile.type.startsWith("image/")) return;
		setFile(selectedFile);
		const url = URL.createObjectURL(selectedFile);
		setPreviewUrl(url);
		setStep(2);
	};

	const onDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const onDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
	};

	const onDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
			handleFile(e.dataTransfer.files[0]);
		}
	};

	const clearFile = () => {
		setFile(null);
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		setPreviewUrl(null);
		setStep(1);
	};

	return (
		<div className="relative min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center overflow-hidden p-6 md:p-12">
			{/* Blurred Image Background Grid */}
			<div className="absolute inset-0 z-0 flex flex-wrap gap-4 opacity-30 pointer-events-none p-4 select-none justify-center">
				{[...Array(12)].map((_, i) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: static decorative grid, never reordered
						key={i}
						className="relative bg-secondary rounded-2xl overflow-hidden aspect-3/4"
						style={{
							width: `calc(25% - 1rem)`,
							transform: `translateY(${i % 2 === 0 ? "20px" : "-20px"})`,
							top: `${Math.random() * 20}px`,
						}}
					>
						<img
							src={
								i % 3 === 0
									? "/hero_headshot_preview_1773972472569.png"
									: i % 2 === 0
										? "/auth_fashion_portrait_1.png"
										: "/auth_fashion_portrait_2.png"
							}
							alt=""
							className="w-full h-full object-cover scale-110"
							draggable={false}
						/>
					</div>
				))}
			</div>
			<div className="absolute inset-0 bg-background/80 backdrop-blur-xl z-0" />

			{/* Main Content Area */}
			<div className="relative z-10 flex flex-col items-center w-full max-w-4xl pt-6">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, ease: "easeOut" }}
					className="text-center space-y-4 mb-8"
				>
					<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-white/10 text-xs font-bold tracking-widest uppercase mb-2">
						<Camera className="w-4 h-4 text-primary" />
						Studio AI Engine
					</div>
					<h1 className="text-5xl md:text-6xl font-display font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-white via-white/90 to-white/40 leading-tight">
						Create <span className="italic font-light">with us.</span>
					</h1>
					<p className="text-lg text-muted-foreground font-light tracking-wide max-w-lg mx-auto mt-4">
						Reimagine your professional presence with Studio 1.0. Upload a
						simple selfie, and let our neural networks craft your legacy.
					</p>
				</motion.div>

				{/* Steps Indicator */}
				<div className="relative w-full max-w-3xl translate-y-6 z-20 flex flex-col sm:flex-row gap-2 px-4 transition-all duration-500">
					<StepCard
						step="01"
						title="Upload your image"
						isActive={step === 1}
						isCompleted={step > 1}
					/>
					<StepCard
						step="02"
						title="Generate styles"
						isActive={step === 2}
						isCompleted={step > 2}
					/>
					<StepCard step="03" title="Share & Export" isActive={step === 3} />
				</div>

				{/* Interactive Modal */}
				<motion.div
					layout
					initial={{ opacity: 0, y: 30, scale: 0.95 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					transition={{ duration: 0.5, ease: "easeOut" }}
					className="w-full max-w-3xl glass rounded-4xl border border-white/10 p-6 shadow-2xl relative z-10 overflow-hidden"
				>
					<div className="flex justify-between items-center mb-6 px-2 relative z-20">
						<div className="flex items-center gap-2">
							<Zap className="w-5 h-5 text-primary" />
							<span className="font-bold tracking-widest text-sm uppercase">
								Studio 1.0
							</span>
						</div>
						<button
							type="button"
							className="flex items-center gap-2 text-xs font-bold tracking-widest text-muted-foreground hover:text-white uppercase transition-colors px-3 py-1.5 rounded-full hover:bg-white/5"
						>
							Best Practices
							<Info className="w-4 h-4" />
						</button>
					</div>

					<AnimatePresence mode="wait">
						{step === 1 && (
							<motion.div
								key="step1"
								initial={{ opacity: 0, x: -20 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: -20, filter: "blur(10px)" }}
								transition={{ duration: 0.4 }}
							>
								{/* Drag & Drop Zone */}
								<input
									type="file"
									className="hidden"
									ref={fileInputRef}
									accept="image/jpeg,image/png,image/webp"
									onChange={(e) =>
										e.target.files && handleFile(e.target.files[0])
									}
								/>
								<button
									type="button"
									onClick={() => fileInputRef.current?.click()}
									onDragOver={onDragOver}
									onDragLeave={onDragLeave}
									onDrop={onDrop}
									className={cn(
										"relative group rounded-3xl border-2 border-dashed transition-all duration-500 bg-white/5 overflow-hidden cursor-pointer w-full text-left",
										isDragging
											? "border-primary bg-primary/10 scale-[1.02]"
											: "border-white/20 hover:border-primary/50",
									)}
								>
									<div className="absolute inset-0 bg-linear-to-t from-background/40 to-transparent pointer-events-none" />

									{/* Placeholder Background in Drop Zone */}
									<div
										className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity bg-cover bg-center duration-1000 grayscale mix-blend-overlay blur-xs scale-110 group-hover:scale-100"
										style={{
											backgroundImage: "url('/auth_fashion_portrait_1.png')",
										}}
									/>

									<div className="relative p-12 flex flex-col items-center justify-center text-center space-y-4">
										<div
											className={cn(
												"w-16 h-16 rounded-full border border-white/10 flex items-center justify-center shadow-xl transition-all duration-500 relative",
												isDragging
													? "bg-primary text-primary-foreground scale-110"
													: "bg-background text-white group-hover:scale-110 group-hover:-translate-y-1",
											)}
										>
											<Upload className="w-6 h-6" />
											<div className="absolute inset-0 rounded-full bg-primary/20 blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
										</div>
										<div>
											<h3 className="text-xl font-bold mb-1">
												Drag & drop your selfie here
											</h3>
											<p className="text-muted-foreground text-sm font-light uppercase tracking-widest">
												JPG or PNG (Max 10MB)
											</p>
										</div>
									</div>
								</button>

								{/* Footer Actions */}
								<div className="mt-6 pt-4 border-t border-white/5 flex flex-col sm:flex-row gap-4 justify-between items-center px-2">
									<div className="flex items-center gap-2 text-xs text-muted-foreground">
										<ShieldCheck className="w-4 h-4" />
										<span>
											Your photos are encrypted and deleted after generation.
										</span>
									</div>
									<Button
										size="lg"
										className="w-full sm:w-auto rounded-full h-12 px-8 uppercase tracking-widest text-xs font-bold bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white border-none cursor-not-allowed group transition-all"
										disabled
									>
										<Zap className="w-4 h-4 mr-2 opacity-50" />
										Add an image to continue
									</Button>
								</div>
							</motion.div>
						)}

						{step === 2 && previewUrl && (
							<motion.div
								key="step2"
								initial={{ opacity: 0, x: 20 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: 20 }}
								transition={{ duration: 0.4 }}
								className="space-y-6"
							>
								<div className="grid md:grid-cols-5 gap-6">
									{/* Uploaded Image Thumbnail */}
									<div className="md:col-span-2 space-y-3">
										<div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold px-2">
											Source Image
										</div>
										<div className="relative rounded-2xl overflow-hidden glass border border-white/10 aspect-square group">
											<img
												src={previewUrl}
												alt="Upload preview"
												className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
											/>
											<button
												type="button"
												onClick={clearFile}
												className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80 border border-white/10"
											>
												<X className="w-4 h-4 text-white" />
											</button>
											<div className="absolute bottom-3 left-3 right-3 px-3 py-2 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 flex items-center gap-2">
												<ImageIcon className="w-4 h-4 text-primary" />
												<span className="text-xs truncate font-medium">
													{file?.name}
												</span>
											</div>
										</div>
									</div>

									{/* Style Selection */}
									<div className="md:col-span-3 space-y-3">
										<div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold px-2">
											Select Studio Direction
										</div>
										<div className="grid grid-cols-2 gap-3">
											{HEADSHOT_STYLES.map((style) => (
												<button
													type="button"
													key={style.id}
													onClick={() => setSelectedStyle(style.id)}
													className={cn(
														"relative text-left rounded-2xl overflow-hidden border transition-all duration-300 group h-32",
														selectedStyle === style.id
															? "border-primary ring-1 ring-primary/50 shadow-lg shadow-primary/20"
															: "border-white/10 hover:border-white/30 brightness-75 hover:brightness-100",
													)}
												>
													<img
														src={style.image}
														alt={style.label}
														className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
													/>
													<div className="absolute inset-0 bg-linear-to-t from-background/90 via-background/40 to-transparent" />

													<div className="absolute inset-0 p-3 flex flex-col justify-end">
														<h4 className="font-bold text-sm text-white mb-0.5">
															{style.label}
														</h4>
														<p className="text-[10px] text-white/70 leading-tight line-clamp-2">
															{style.description}
														</p>
													</div>

													{selectedStyle === style.id && (
														<div className="absolute top-3 right-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-lg">
															<CheckCircle2 className="w-3 h-3 text-primary-foreground" />
														</div>
													)}
												</button>
											))}
										</div>
									</div>
								</div>

								{/* Footer Actions */}
								<div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row gap-4 justify-between items-center px-2">
									<div className="flex items-center gap-2 text-xs text-muted-foreground">
										<Zap className="w-4 h-4 text-primary" />
										<span>
											Generates 4 high-resolution portraits per style.
										</span>
									</div>
									<Button
										size="lg"
										className="w-full sm:w-auto rounded-full h-12 px-8 uppercase tracking-widest text-xs font-bold transition-all"
										disabled={!selectedStyle}
										onClick={handleGenerate}
									>
										Begin Generation (10 Credits)
									</Button>
								</div>
							</motion.div>
						)}

						{step === 3 && (
							<motion.div
								key="step3"
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.95 }}
								transition={{ duration: 0.5 }}
								className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center"
							>
								{isGenerating ? (
									<div className="space-y-8 flex flex-col items-center max-w-sm mx-auto">
										<div className="relative">
											<div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
											<div className="w-24 h-24 rounded-full border border-white/10 glass flex items-center justify-center relative">
												<Loader2 className="w-10 h-10 text-primary animate-spin" />
											</div>
										</div>
										<div className="space-y-2">
											<h3 className="text-2xl font-display font-bold bg-clip-text text-transparent bg-linear-to-r from-white to-white/60">
												Crafting your legacy...
											</h3>
											<p className="text-sm text-muted-foreground font-light">
												Our neural networks are analyzing facial structures and
												applying{" "}
												{HEADSHOT_STYLES.find((s) => s.id === selectedStyle)
													?.label || "premium"}{" "}
												enhancements.
											</p>
										</div>
									</div>
								) : (
									<div className="space-y-8 w-full">
										<div className="space-y-2">
											<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-bold tracking-widest uppercase mb-2 border border-green-500/20">
												<Sparkles className="w-3 h-3" />
												Generation Complete
											</div>
											<h3 className="text-3xl font-display font-bold">
												Your new headshots
											</h3>
										</div>

										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
											{generatedImage ? (
												<motion.div
													initial={{ opacity: 0, scale: 0.9 }}
													animate={{ opacity: 1, scale: 1 }}
													transition={{ duration: 0.5 }}
													className="aspect-3/4 rounded-2xl overflow-hidden glass border border-white/10 relative group col-span-1 sm:col-span-2 md:col-span-2 w-full max-w-sm mx-auto shadow-2xl shadow-primary/20"
												>
													<img
														src={generatedImage}
														alt="Generated headshot"
														className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
													/>
													<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
														<Button
															size="icon"
															variant="secondary"
															className="rounded-full w-12 h-12 shadow-xl hover:scale-110 transition-transform"
															onClick={() =>
																generatedImage && handleDownload(generatedImage)
															}
														>
															<Download className="w-5 h-5" />
														</Button>
													</div>
												</motion.div>
											) : (
												<div className="col-span-2 text-muted-foreground p-8">
													No image returned.
												</div>
											)}
										</div>

										<div className="pt-6 border-t border-white/5 flex justify-center gap-4">
											<Button
												variant="outline"
												className="rounded-full px-8 h-12 uppercase tracking-widest text-xs font-bold border-white/10"
												onClick={clearFile}
											>
												Start Over
											</Button>
											<Button className="rounded-full px-8 h-12 uppercase tracking-widest text-xs font-bold">
												Download All High-Res
											</Button>
										</div>
									</div>
								)}
							</motion.div>
						)}
					</AnimatePresence>
				</motion.div>
			</div>
		</div>
	);
}

function StepCard({
	step,
	title,
	isActive = false,
	isCompleted = false,
}: {
	step: string;
	title: string;
	isActive?: boolean;
	isCompleted?: boolean;
}) {
	return (
		<div
			className={cn(
				"flex-1 p-4 rounded-xl border flex flex-col justify-center backdrop-blur-xl transition-all duration-500",
				isActive
					? "bg-primary/20 border-primary shadow-lg shadow-primary/20 scale-[1.02] z-10"
					: "bg-background hover:bg-white/5 border-white/10",
				isCompleted && "bg-white/5 border-white/20 border-dashed",
			)}
		>
			<span
				className={cn(
					"text-[10px] font-bold tracking-widest uppercase mb-1 flex items-center gap-2",
					isActive ? "text-primary" : "text-muted-foreground",
				)}
			>
				Step {step}
				{isCompleted && <CheckCircle2 className="w-3 h-3 text-green-500" />}
			</span>
			<span
				className={cn(
					"text-sm font-medium",
					isActive ? "text-white" : "text-white/70",
				)}
			>
				{title}
			</span>
		</div>
	);
}
