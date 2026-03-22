import { Download, Loader2, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { HEADSHOT_STYLES } from "#/modules/studio/domain/styles";
import { Button } from "@/components/ui/button";

interface StudioGenerationResultProps {
	isGenerating: boolean;
	generatedImage: string | null;
	selectedStyle: string | null;
	onStartOver: () => void;
}

async function downloadImage(url: string) {
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
	} catch (e: unknown) {
		console.error("Download failed", e);
		toast.error("Failed to download image.");
	}
}

export function StudioGenerationResult({
	isGenerating,
	generatedImage,
	selectedStyle,
	onStartOver,
}: StudioGenerationResultProps) {
	if (isGenerating) {
		return (
			<div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center">
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
							Our neural networks are analyzing facial structures and applying{" "}
							{HEADSHOT_STYLES.find((s) => s.id === selectedStyle)?.label ||
								"premium"}{" "}
							enhancements.
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center">
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
									onClick={() => downloadImage(generatedImage)}
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
						onClick={onStartOver}
					>
						Start Over
					</Button>
					<Button className="rounded-full px-8 h-12 uppercase tracking-widest text-xs font-bold">
						Download All High-Res
					</Button>
				</div>
			</div>
		</div>
	);
}
