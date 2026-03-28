import { Download, Heart, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GalleryItem } from "../domain/headshot.types";

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
				src={item.thumbnail ?? item.src}
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
