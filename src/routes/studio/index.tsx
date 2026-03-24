import { createFileRoute } from "@tanstack/react-router";
import { Camera, CheckCircle2, Info, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "#/lib/auth-client";
import { StudioGenerationResult } from "#/modules/studio/components/studio-generation-result";
import { StudioStyleSelector } from "#/modules/studio/components/studio-style-selector";
import { StudioUploadZone } from "#/modules/studio/components/studio-upload-zone";
import { useGenerationPolling } from "#/modules/studio/components/use-generation-polling";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/")({
	component: StudioIndexPage,
});

function StudioIndexPage() {
	const { data: session, refetch } = authClient.useSession();
	const [step, setStep] = useState<1 | 2 | 3>(1);
	const [file, setFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
	const [isGenerating, setIsGenerating] = useState(false);
	const [generatedImage, setGeneratedImage] = useState<string | null>(null);

	const { startPolling } = useGenerationPolling({
		onCompleted: async (resultUrl) => {
			setGeneratedImage(resultUrl);
			setIsGenerating(false);
			await refetch();
			toast.success("Generation Complete!");
		},
		onFailed: async () => {
			setIsGenerating(false);
			await refetch();
			toast.error("Generation failed. Credits have been refunded.");
			setStep(2);
		},
		onTimeout: () => {
			setIsGenerating(false);
			toast.info(
				"Generation is taking longer than expected. Check your gallery later.",
			);
		},
	});

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
				throw new Error(err.error || "Failed to start generation.");
			}

			const { job_id } = await generateRes.json();
			await refetch();
			toast.info("Generation started! This may take a moment...");
			startPolling(job_id);
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : "Something went wrong.");
			setIsGenerating(false);
			setStep(2);
		}
	};

	return (
		<div className="relative min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center overflow-hidden p-6 md:p-12">
			<BackgroundGrid />
			<div className="absolute inset-0 bg-background/80 backdrop-blur-xl z-0" />

			<div className="relative z-10 flex flex-col items-center w-full max-w-4xl pt-6">
				<StudioHero />

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
								<StudioUploadZone onFileSelected={handleFileSelected} />
							</motion.div>
						)}

						{step === 2 && previewUrl && (
							<motion.div
								key="step2"
								initial={{ opacity: 0, x: 20 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: 20 }}
								transition={{ duration: 0.4 }}
							>
								<StudioStyleSelector
									previewUrl={previewUrl}
									fileName={file?.name ?? ""}
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
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.95 }}
								transition={{ duration: 0.5 }}
							>
								<StudioGenerationResult
									isGenerating={isGenerating}
									generatedImage={generatedImage}
									selectedStyle={selectedStyle}
									onStartOver={handleClear}
								/>
							</motion.div>
						)}
					</AnimatePresence>
				</motion.div>
			</div>
		</div>
	);
}

const GRID_IMAGES = [
	"/hero_headshot_preview_1773972472569.png",
	"/auth_fashion_portrait_1.png",
	"/auth_fashion_portrait_2.png",
];

// Static offsets replace Math.random() to avoid SSR hydration mismatch
const GRID_OFFSETS = [0, 20, 5, 15, 0, 20, 10, 5, 20, 0, 15, 10];

function BackgroundGrid() {
	return (
		<div className="absolute inset-0 z-0 flex flex-wrap gap-4 opacity-30 pointer-events-none p-4 select-none justify-center">
			{GRID_OFFSETS.map((offset, i) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: static decorative grid, never reordered
					key={i}
					className="relative bg-secondary rounded-2xl overflow-hidden aspect-3/4"
					style={{
						width: `calc(25% - 1rem)`,
						transform: `translateY(${i % 2 === 0 ? "20px" : "-20px"})`,
						top: `${offset}px`,
					}}
				>
					<img
						src={GRID_IMAGES[i % 3]}
						alt=""
						className="w-full h-full object-cover scale-110"
						draggable={false}
						loading="lazy"
					/>
				</div>
			))}
		</div>
	);
}

function StudioHero() {
	return (
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
				Reimagine your professional presence with Studio 1.0. Upload a simple
				selfie, and let our neural networks craft your legacy.
			</p>
		</motion.div>
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
