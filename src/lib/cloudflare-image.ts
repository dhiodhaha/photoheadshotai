/**
 * Cloudflare Image Resizing utility
 *
 * Transforms any R2/CDN URL into a Cloudflare Image Resizing URL.
 * Requires "Image Resizing" to be enabled in Cloudflare dashboard (Speed > Optimization).
 *
 * Format: /cdn-cgi/image/<options>/<full-url-or-path>
 *
 * @see https://developers.cloudflare.com/images/transform-images/
 */

interface ImageOptions {
	width?: number;
	height?: number;
	quality?: number;
	format?: "auto" | "webp" | "avif" | "jpeg" | "png";
	fit?: "cover" | "contain" | "scale-down" | "crop";
}

function isR2Url(src: string): boolean {
	return src.includes("standoutheadshot.com") || src.startsWith("/");
}

export function cfImage(src: string, options: ImageOptions = {}): string {
	if (!src) return src;
	// Only apply Cloudflare Image Resizing to our own R2/CDN URLs
	if (!isR2Url(src)) return src;

	const {
		width,
		height,
		quality = 85,
		format = "auto",
		fit = "cover",
	} = options;

	const params: string[] = [
		`format=${format}`,
		`fit=${fit}`,
		`quality=${quality}`,
	];

	if (width) params.push(`width=${width}`);
	if (height) params.push(`height=${height}`);

	return `/cdn-cgi/image/${params.join(",")}/${src}`;
}

/** Pre-configured sizes for common use cases */
export const cfImg = {
	thumbnail: (src: string) =>
		cfImage(src, { width: 400, height: 533, quality: 80 }),
	gallery: (src: string) => cfImage(src, { width: 800, quality: 85 }),
	full: (src: string) => cfImage(src, { quality: 90, format: "auto" }),
};
