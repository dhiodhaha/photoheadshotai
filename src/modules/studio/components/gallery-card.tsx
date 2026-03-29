import { Download, Heart, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cfImg } from "@/lib/cloudflare-image";
import { cn } from "@/lib/utils";
import type { GalleryItem } from "../domain/headshot.types";

const STAGES = [
	"Analyzing your photo...",
	"Applying professional style...",
	"Generating headshot...",
	"Almost there...",
] as const;

// Stage thresholds in seconds
const STAGE_TIMES = [0, 8, 18, 30] as const;

interface GalleryCardProps {
	item: GalleryItem;
	onFavorite: () => void;
	onDelete: () => void;
	onDownload: () => void;
}

export function GalleryCard({
	item,
	onFavorite,
	onDelete,
	onDownload,
}: GalleryCardProps) {
	const [progress, setProgress] = useState(0);
	const [stageIndex, setStageIndex] = useState(0);

	useEffect(() => {
		if (!item.isPending) return;

		const startTime = item.createdAt.getTime();

		const tick = () => {
			const elapsed = (Date.now() - startTime) / 1000;

			// Progress: 0→60% in first 10s, 60→90% over next 25s, hold at 90%
			let p: number;
			if (elapsed < 10) {
				p = (elapsed / 10) * 60;
			} else if (elapsed < 35) {
				p = 60 + ((elapsed - 10) / 25) * 30;
			} else {
				p = 90;
			}
			setProgress(Math.min(90, p));

			// Advance stage label based on elapsed time
			let stage = 0;
			for (let i = STAGE_TIMES.length - 1; i >= 0; i--) {
				if (elapsed >= STAGE_TIMES[i]) {
					stage = i;
					break;
				}
			}
			setStageIndex(stage);
		};

		tick(); // run immediately so card doesn't flash 0%
		const id = setInterval(tick, 500);
		return () => clearInterval(id);
	}, [item.isPending, item.createdAt]);

	if (item.isPending) {
		return (
			<motion.div
				layout
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				className="relative aspect-3/4 rounded-2xl overflow-hidden glass border border-primary/20 bg-primary/5"
			>
				{/* Ambient glow */}
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-primary/15 rounded-full blur-3xl" />

				<div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-5">
					{/* Spinner */}
					<motion.div
						animate={{ rotate: 360 }}
						transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
						className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
					/>

					{/* Stage label */}
					<motion.span
						key={stageIndex}
						initial={{ opacity: 0, y: 4 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -4 }}
						transition={{ duration: 0.3 }}
						className="text-[10px] font-bold uppercase tracking-widest text-primary text-center"
					>
						{STAGES[stageIndex]}
					</motion.span>

					{/* Progress bar */}
					<div className="w-full h-0.5 rounded-full bg-primary/10 overflow-hidden">
						<motion.div
							className="h-full bg-primary/60 rounded-full"
							animate={{ width: `${progress}%` }}
							transition={{ duration: 0.5, ease: "easeOut" }}
						/>
					</div>

					{/* Percentage */}
					<span className="text-[9px] font-medium text-primary/40 tabular-nums">
						{Math.round(progress)}%
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
				src={cfImg.thumbnail(item.src)}
				alt=""
				loading="lazy"
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
