import { ShieldCheck, Upload, Zap } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StudioUploadZoneProps {
	onFileSelected: (file: File) => void;
}

export function StudioUploadZone({ onFileSelected }: StudioUploadZoneProps) {
	const [isDragging, setIsDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFile = (file: File) => {
		if (!file.type.startsWith("image/")) return;
		onFileSelected(file);
	};

	const onDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const onDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
	};

	const onDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
			handleFile(e.dataTransfer.files[0]);
		}
	};

	return (
		<div>
			<input
				type="file"
				className="hidden"
				ref={fileInputRef}
				accept="image/jpeg,image/png,image/webp"
				onChange={(e) => e.target.files && handleFile(e.target.files[0])}
			/>
			<button
				type="button"
				onClick={() => fileInputRef.current?.click()}
				onDragOver={onDragOver}
				onDragLeave={onDragLeave}
				onDrop={onDrop}
				className={cn(
					"relative group rounded-3xl border-2 border-dashed transition-all duration-500 bg-white/5 overflow-hidden cursor-pointer w-full text-left",
					isDragging
						? "border-primary bg-primary/10 scale-[1.02]"
						: "border-white/20 hover:border-primary/50",
				)}
			>
				<div className="absolute inset-0 bg-linear-to-t from-background/40 to-transparent pointer-events-none" />
				<div
					className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity bg-cover bg-center duration-1000 grayscale mix-blend-overlay blur-xs scale-110 group-hover:scale-100"
					style={{
						backgroundImage: "url('/auth_fashion_portrait_1.png')",
					}}
				/>
				<div className="relative p-12 flex flex-col items-center justify-center text-center space-y-4">
					<div
						className={cn(
							"w-16 h-16 rounded-full border border-white/10 flex items-center justify-center shadow-xl transition-all duration-500 relative",
							isDragging
								? "bg-primary text-primary-foreground scale-110"
								: "bg-background text-white group-hover:scale-110 group-hover:-translate-y-1",
						)}
					>
						<Upload className="w-6 h-6" />
						<div className="absolute inset-0 rounded-full bg-primary/20 blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
					</div>
					<div>
						<h3 className="text-xl font-bold mb-1">
							Drag & drop your selfie here
						</h3>
						<p className="text-muted-foreground text-sm font-light uppercase tracking-widest">
							JPG or PNG (Max 10MB)
						</p>
					</div>
				</div>
			</button>

			<div className="mt-6 pt-4 border-t border-white/5 flex flex-col sm:flex-row gap-4 justify-between items-center px-2">
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					<ShieldCheck className="w-4 h-4" />
					<span>Your photos are encrypted and deleted after generation.</span>
				</div>
				<Button
					size="lg"
					className="w-full sm:w-auto rounded-full h-12 px-8 uppercase tracking-widest text-xs font-bold bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white border-none cursor-not-allowed group transition-all"
					disabled
				>
					<Zap className="w-4 h-4 mr-2 opacity-50" />
					Add an image to continue
				</Button>
			</div>
		</div>
	);
}
