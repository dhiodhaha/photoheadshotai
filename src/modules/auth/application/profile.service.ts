import { updateUser } from "../infrastructure/user.repository";
import { updateProfileSchema } from "./auth.schema";

export async function updateUserProfile(
	userId: string,
	input: { name: string },
) {
	const parsed = updateProfileSchema.parse(input);
	return updateUser(userId, { name: parsed.name });
}
