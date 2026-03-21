import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { motion } from "motion/react";

interface AuthLeftPanelProps {
	imageSrc: string;
	quote: string;
}

export function AuthLeftPanel({ imageSrc, quote }: AuthLeftPanelProps) {
	return (
		<div className="relative hidden lg:block overflow-hidden group">
			<motion.div
				initial={{ scale: 1.1, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
				className="absolute inset-0"
			>
				<img
					src={imageSrc}
					alt="Fashion Portrait"
					className="w-full h-full object-cover grayscale brightness-75 group-hover:scale-105 transition-transform duration-[3s]"
				/>
				<div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent opacity-80" />
			</motion.div>

			<div className="absolute bottom-16 left-16 right-16 space-y-6">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.5, duration: 1 }}
				>
					<span className="text-xs uppercase tracking-[4px] text-white/60 mb-4 block">
						The Studio Standard
					</span>
					<h2 className="text-5xl font-display italic text-white leading-tight">
						{quote}
					</h2>
				</motion.div>
			</div>

			<div className="absolute top-12 left-12">
				<Link
					to="/"
					className="flex items-center gap-2 text-white/60 hover:text-white transition-colors group"
				>
					<ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
					<span className="text-sm uppercase tracking-widest font-medium">
						Back to Studio
					</span>
				</Link>
			</div>
		</div>
	);
}
