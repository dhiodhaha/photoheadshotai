import { z } from "zod";

export const ALLOWED_CONTENT_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const uploadFileSchema = z.object({
	contentType: z.enum(ALLOWED_CONTENT_TYPES, {
		message: "Only JPEG, PNG, and WebP are allowed",
	}),
	size: z
		.number()
		.int()
		.positive()
		.max(MAX_FILE_SIZE, "File must be under 10MB"),
	filename: z.string().min(1),
});

export type UploadFileInput = z.infer<typeof uploadFileSchema>;
