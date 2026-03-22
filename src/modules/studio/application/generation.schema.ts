import { z } from "zod/v4";

export const generateSchema = z.object({
	image_id: z.string().min(1, "image_id is required"),
	style: z.string().min(1, "style is required"),
});
