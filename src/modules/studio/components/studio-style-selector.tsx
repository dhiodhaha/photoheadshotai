import { Sparkles, X } from "lucide-react";
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
		<div className="flex items-center gap-2 sm:gap-4 w-full h-28">
			{/* Source Thumbnail */}
			<div className="relative group shrink-0">
				<div className="w-14 h-14 sm:w-20 sm:h-20 rounded-[22px] overflow-hidden glass border-2 border-white/10 transition-all duration-300">
					<img
						src={previewUrl}
						alt="Source"
						className="w-full h-full object-cover"
					/>
				</div>
				<button
					type="button"
					onClick={onClear}
					className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-xl hover:bg-red-600 transition-colors z-10"
				>
					<X className="w-3 h-3 sm:w-4 sm:h-4" />
				</button>
			</div>

			<div className="h-14 w-px bg-white/10 shrink-0 mx-1" />

			{/* Styles Scrollable Area with Fade Gradient */}
			<div className="flex-1 min-w-0 relative">
				<div
					className="flex items-center gap-2 sm:gap-3 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-2 px-1"
					style={{
						maskImage:
							"linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)",
						WebkitMaskImage:
							"linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)",
					}}
				>
					{HEADSHOT_STYLES.map((style) => (
						<button
							type="button"
							key={style.id}
							disabled={style.disabled}
							onClick={() => !style.disabled && onStyleSelect(style.id)}
							className={cn(
								"group relative flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-all duration-300 shrink-0 min-w-[130px] sm:min-w-44",
								style.disabled
									? "opacity-30 grayscale cursor-not-allowed border-transparent"
									: selectedStyle === style.id
										? "bg-primary/20 border-primary ring-2 ring-primary/30"
										: "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10",
							)}
						>
							<div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0">
								<img
									src={style.image}
									alt={style.label}
									className="w-full h-full object-cover"
								/>
							</div>
							<div className="flex-1 text-left min-w-0">
								<p
									className={cn(
										"text-xs sm:text-base font-black truncate transition-colors",
										selectedStyle === style.id ? "text-primary" : "text-white",
									)}
								>
									{style.label}
								</p>
								<p className="text-[8px] sm:text-[10px] text-muted-foreground truncate uppercase tracking-[0.2em] font-black">
									{style.disabled ? "Soon" : "Ready"}
								</p>
							</div>
						</button>
					))}
				</div>
			</div>

			{/* Action Button: Styled to align with project guide (Pill Primary) */}
			<Button
				disabled={!selectedStyle}
				onClick={onGenerate}
				className="md:hidden rounded-full h-14 w-14 flex items-center justify-center p-0 shrink-0 shadow-lg shadow-primary/20"
			>
				<Sparkles className="w-6 h-6" />
			</Button>
			<Button
				size="lg"
				disabled={!selectedStyle}
				onClick={onGenerate}
				className="hidden md:flex rounded-full h-20 px-8 gap-3 shrink-0 uppercase tracking-widest text-[11px] font-black italic shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
			>
				<Sparkles className="w-5 h-5" />
				Generate
			</Button>
		</div>
	);
}
