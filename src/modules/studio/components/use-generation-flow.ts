import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCreditsActions } from "#/modules/credits/components/use-credits";
import { useGenerationPolling } from "./use-generation-polling";

interface UseGenerationFlowOptions {
	onGenerating?: (isGenerating: boolean) => void;
	onGeneratedImage?: (url: string | null) => void;
	onStep: (step: 1 | 2 | 3) => void;
}

const GENERATION_COST = 10;

export function useGenerationFlow({
	onGenerating,
	onGeneratedImage,
	onStep,
}: UseGenerationFlowOptions) {
	const queryClient = useQueryClient();
	const { deduct, invalidate } = useCreditsActions();

	const { startPolling } = useGenerationPolling({
		onCompleted: (resultUrl) => {
			onGeneratedImage?.(resultUrl);
			onGenerating?.(false);
			invalidate();
			queryClient.invalidateQueries({ queryKey: ["gallery"] });
		},
		onFailed: () => {
			onGenerating?.(false);
			invalidate(); // Refund may have happened — sync with DB
			queryClient.invalidateQueries({ queryKey: ["gallery"] });
			toast.error("Generation failed. Credits have been refunded.");
			onStep(2);
		},
		onTimeout: () => {
			onGenerating?.(false);
			queryClient.invalidateQueries({ queryKey: ["gallery"] });
		},
	});

	const generate = async (
		file: File,
		selectedStyle: string,
		currentCredits: number,
	) => {
		if (currentCredits < GENERATION_COST) {
			toast.error(
				"Insufficient credits. Please top up in the Billing section.",
			);
			return;
		}

		onStep(3);
		onGenerating?.(true);

		try {
			// Step 1: Get presigned PUT URL from server (no data transfer)
			const urlRes = await fetch("/api/studio/upload-url", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					contentType: file.type,
					size: file.size,
					filename: file.name,
				}),
			});

			if (!urlRes.ok) {
				const err = await urlRes.json();
				throw new Error(err.error || "Failed to get upload URL.");
			}

			const { presignedUrl, key, filename } = await urlRes.json();

			// Step 2: Upload directly to R2 (bypasses VPS)
			if (presignedUrl) {
				const putRes = await fetch(presignedUrl, {
					method: "PUT",
					headers: { "Content-Type": file.type },
					body: file,
				});

				if (!putRes.ok) {
					throw new Error("Failed to upload image to storage.");
				}
			}

			// Step 3: Confirm upload with server (creates DB record)
			const confirmRes = await fetch("/api/studio/upload-confirm", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					key,
					filename: filename || file.name,
					contentType: file.type,
					size: file.size,
				}),
			});

			if (!confirmRes.ok) {
				const err = await confirmRes.json();
				throw new Error(err.error || "Failed to confirm upload.");
			}

			const { image_id } = await confirmRes.json();

			const generateRes = await fetch("/api/studio/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ image_id, style: selectedStyle }),
			});

			if (!generateRes.ok) {
				const err = await generateRes.json();
				throw new Error(err.error || "Failed to start generation.");
			}

			const { job_id } = await generateRes.json();
			deduct(GENERATION_COST); // Instant UI update
			queryClient.invalidateQueries({ queryKey: ["gallery"] });

			startPolling(job_id);
		} catch (e: unknown) {
			const message = e instanceof Error ? e.message : "Something went wrong.";
			toast.error(message);
			onGenerating?.(false);
			onStep(2);
		}
	};

	return { generate };
}
