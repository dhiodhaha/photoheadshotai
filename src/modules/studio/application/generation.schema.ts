import { z } from "zod/v4";
import { HEADSHOT_STYLES } from "../domain/styles";

const enabledStyleIds = HEADSHOT_STYLES.filter((s) => !s.disabled).map(
	(s) => s.id,
) as [string, ...string[]];

export const generateSchema = z.object({
	image_id: z.string().min(1, "image_id is required"),
	style: z.enum(enabledStyleIds, {
		error: "Invalid or unavailable style.",
	}),
});
