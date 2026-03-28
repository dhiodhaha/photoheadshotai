import { RotateCcw, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import type { TrashItem } from "../domain/headshot.types";

interface TrashCardProps {
	item: TrashItem;
	onRestore: () => void;
	onDelete: () => void;
}

export function TrashCard({ item, onRestore, onDelete }: TrashCardProps) {
	return (
		<motion.div
			layout
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			className="group relative aspect-3/4 rounded-2xl overflow-hidden glass border border-white/10"
		>
			<img
				src={item.thumbnail ?? item.src}
				alt=""
				loading="lazy"
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
