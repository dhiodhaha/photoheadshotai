import { Upload } from "lucide-react";
import { useRef, useState } from "react";
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

	return (
		<div className="flex-1">
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
				onDragOver={(e) => {
					e.preventDefault();
					setIsDragging(true);
				}}
				onDragLeave={(e) => {
					e.preventDefault();
					setIsDragging(false);
				}}
				onDrop={(e) => {
					e.preventDefault();
					setIsDragging(false);
					if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
				}}
				className={cn(
					"relative group flex items-center gap-3 sm:gap-6 p-3 sm:p-4 rounded-2xl border-2 border-dashed transition-all duration-500 bg-white/5 cursor-pointer w-full text-left",
					isDragging
						? "border-primary bg-primary/10 scale-[1.01]"
						: "border-white/10 hover:border-white/30",
				)}
			>
				<div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500">
					<Upload className="w-4 h-4 sm:w-5 sm:h-5" />
				</div>
				<div className="flex-1 min-w-0">
					<h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-primary transition-colors truncate">
						Upload Source
					</h3>
					<p className="text-[8px] sm:text-[10px] text-muted-foreground uppercase tracking-widest font-medium truncate">
						Click or drag & drop
					</p>
				</div>
			</button>
		</div>
	);
}
