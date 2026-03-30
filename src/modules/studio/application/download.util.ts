import { toast } from "sonner";
import { cfImg } from "#/lib/cloudflare-image";

export async function downloadHeadshot(url: string): Promise<void> {
	try {
		// Route through /cdn-cgi/image/ for same-origin download (avoids CORS on R2 URLs)
		const downloadUrl = cfImg.full(url);
		const response = await fetch(downloadUrl);
		if (!response.ok) {
			toast.error("Download failed. The image may no longer be available.");
			return;
		}
		const blob = await response.blob();
		const blobUrl = window.URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = blobUrl;
		link.download = `headshot-${Date.now()}.png`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		window.URL.revokeObjectURL(blobUrl);
	} catch (e: unknown) {
		toast.error("Download failed. Please try again.");
	}
}
