import { Sparkles } from "lucide-react";
import { motion } from "motion/react";

interface StudioEmptyStateProps {
	title: string;
	description: string;
	icon?: React.ReactNode;
}

export function StudioEmptyState({
	title,
	description,
	icon = <Sparkles className="w-6 h-6" />,
}: StudioEmptyStateProps) {
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
