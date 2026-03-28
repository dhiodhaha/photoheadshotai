import { Info } from "lucide-react";
import { motion } from "motion/react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

export function StudioImageGuidelines() {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<motion.button
					type="button"
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					className="p-1.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-all"
					title="Optimal Image Sourcing Guidelines"
				>
					<Info className="w-4 h-4" />
				</motion.button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md md:max-w-xl glass bg-background/95 backdrop-blur-xl border-white/10 text-white max-h-[85vh] overflow-y-auto">
				<DialogHeader className="mb-2 text-left">
					<DialogTitle className="text-xl font-display font-bold">
						Optimal Image Sourcing
					</DialogTitle>
					<DialogDescription className="text-muted-foreground text-left">
						Follow these guidelines to get the best AI generation results.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 mt-2">
					<div className="space-y-3">
						<h4 className="font-semibold text-emerald-400 flex items-center gap-2 leading-none">
							Recommended Practices
						</h4>
						<ul className="space-y-2 text-sm text-white/80 list-disc list-outside ml-4">
							<li>
								<strong className="text-white">
									Opt for authentic, well-captured photographs:
								</strong>{" "}
								Providing a pristine baseline helps the generation model map out
								structural details more accurately.
							</li>
							<li>
								<strong className="text-white">
									Prioritize strong, deliberate lighting:
								</strong>{" "}
								Distinct shadows and highlights allow the tool to render depth
								and volume effectively.
							</li>
							<li>
								<strong className="text-white">
									Select crisp, high-resolution visuals:
								</strong>{" "}
								Maximizing image detail ensures the process picks up precise
								borders and physical traits.
							</li>
							<li>
								<strong className="text-white">
									Utilize 1:1 aspect ratios:
								</strong>{" "}
								Cropping your image to a square standardizes the frame, which
								keeps the layout focused and prevents unintended compositional
								shifts.
							</li>
							<li>
								<strong className="text-white">
									Feature unique stylistic elements:
								</strong>{" "}
								Striking poses, distinctive garments, or bold hairstyles inject
								a much stronger character into the final result.
							</li>
							<li>
								<strong className="text-white">
									Focus on a single central subject:
								</strong>{" "}
								Isolating one main focal point minimizes processing confusion
								and keeps the visual transformation highly accurate.
							</li>
						</ul>
					</div>

					<div className="space-y-3">
						<h4 className="font-semibold text-red-400 flex items-center gap-2 leading-none">
							What to Avoid
						</h4>
						<ul className="space-y-2 text-sm text-white/80 list-disc list-outside ml-4">
							<li>Heavily edited, pre-filtered, or low-clarity pictures.</li>
							<li>
								Files suffering from compression artifacts, pixelation, or
								movement distortion.
							</li>
							<li>
								Cluttered visual layouts or photos containing multiple subjects.
							</li>
						</ul>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
