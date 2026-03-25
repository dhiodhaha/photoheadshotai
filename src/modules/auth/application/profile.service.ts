import { getUserById, updateUser } from "../infrastructure/user.repository";
import { updateProfileSchema } from "./auth.schema";

export async function getUserProfile(userId: string) {
	return getUserById(userId);
}

export async function updateUserProfile(
	userId: string,
	input: { name: string },
) {
	const parsed = updateProfileSchema.parse(input);
	return updateUser(userId, { name: parsed.name });
}
