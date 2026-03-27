import { CheckCircle2, X, Zap } from "lucide-react";
import { HEADSHOT_STYLES } from "#/modules/studio/domain/styles";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StudioStyleSelectorProps {
	previewUrl: string;
	selectedStyle: string | null;
	onStyleSelect: (styleId: string) => void;
	onClear: () => void;
	onGenerate: () => void;
}

export function StudioStyleSelector({
	previewUrl,
	selectedStyle,
	onStyleSelect,
	onClear,
	onGenerate,
}: StudioStyleSelectorProps) {
	return (
		<div className="flex items-center gap-3 sm:gap-6 w-full py-1">
			{/* Source Thumbnail */}
			<div className="relative group shrink-0">
				<div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl overflow-hidden glass border border-white/10 group-hover:border-primary/50 transition-all duration-300">
					<img
						src={previewUrl}
						alt="Source"
						className="w-full h-full object-cover"
					/>
				</div>
				<button
					type="button"
					onClick={onClear}
					className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
				>
					<X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
				</button>
			</div>

			<div className="h-8 sm:h-10 w-px bg-white/10 shrink-0" />

			{/* Styles Scrollable Area */}
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar py-2">
					{HEADSHOT_STYLES.map((style) => (
						<button
							type="button"
							key={style.id}
							disabled={style.disabled}
							onClick={() => !style.disabled && onStyleSelect(style.id)}
							className={cn(
								"group relative flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border transition-all duration-300 shrink-0 min-w-[100px] sm:min-w-32",
								style.disabled
									? "opacity-30 grayscale cursor-not-allowed border-transparent"
									: selectedStyle === style.id
										? "bg-primary/10 border-primary ring-1 ring-primary/50"
										: "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10",
							)}
						>
							<div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg overflow-hidden shrink-0">
								<img
									src={style.image}
									alt={style.label}
									className="w-full h-full object-cover"
								/>
							</div>
							<div className="flex-1 text-left min-w-0">
								<p
									className={cn(
										"text-[8px] sm:text-[10px] font-bold truncate",
										selectedStyle === style.id ? "text-primary" : "text-white",
									)}
								>
									{style.label}
								</p>
								<p className="text-[7px] sm:text-[8px] text-muted-foreground truncate uppercase tracking-widest font-medium">
									{style.disabled ? "Soon" : "Ready"}
								</p>
							</div>
							{selectedStyle === style.id && (
								<CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary absolute top-1 right-1" />
							)}
						</button>
					))}
				</div>
			</div>

			{/* Action Button */}
			<Button
				size="sm"
				disabled={!selectedStyle}
				onClick={onGenerate}
				className="md:hidden rounded-xl h-10 w-10 flex items-center justify-center p-0 shrink-0 shadow-lg shadow-primary/20"
			>
				<Zap className="w-4 h-4 text-primary-foreground" />
			</Button>
			<Button
				size="lg"
				disabled={!selectedStyle}
				onClick={onGenerate}
				className="hidden md:flex rounded-xl h-14 px-6 gap-3 shrink-0 uppercase tracking-widest text-[10px] font-black italic shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
			>
				<Zap className="w-4 h-4" />
				Generate
			</Button>
		</div>
	);
}
