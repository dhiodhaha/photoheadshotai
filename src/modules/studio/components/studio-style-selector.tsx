import { CheckCircle2, ImageIcon, X, Zap } from "lucide-react";
import { HEADSHOT_STYLES } from "#/modules/studio/domain/styles";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StudioStyleSelectorProps {
	previewUrl: string;
	fileName: string;
	selectedStyle: string | null;
	onStyleSelect: (styleId: string) => void;
	onClear: () => void;
	onGenerate: () => void;
}

export function StudioStyleSelector({
	previewUrl,
	fileName,
	selectedStyle,
	onStyleSelect,
	onClear,
	onGenerate,
}: StudioStyleSelectorProps) {
	return (
		<div className="space-y-6">
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
							onClick={onClear}
							className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80 border border-white/10"
						>
							<X className="w-4 h-4 text-white" />
						</button>
						<div className="absolute bottom-3 left-3 right-3 px-3 py-2 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 flex items-center gap-2">
							<ImageIcon className="w-4 h-4 text-primary" />
							<span className="text-xs truncate font-medium">{fileName}</span>
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
								disabled={style.disabled}
								onClick={() => !style.disabled && onStyleSelect(style.id)}
								className={cn(
									"relative text-left rounded-2xl overflow-hidden border transition-all duration-300 group h-32",
									style.disabled
										? "border-white/5 opacity-40 cursor-not-allowed"
										: selectedStyle === style.id
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
										{style.disabled ? "Coming soon" : style.description}
									</p>
								</div>

								{selectedStyle === style.id && !style.disabled && (
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
					<span>Generates 4 high-resolution portraits per style.</span>
				</div>
				<Button
					size="lg"
					className="w-full sm:w-auto rounded-full h-12 px-8 uppercase tracking-widest text-xs font-bold transition-all"
					disabled={!selectedStyle}
					onClick={onGenerate}
				>
					Begin Generation (10 Credits)
				</Button>
			</div>
		</div>
	);
}
