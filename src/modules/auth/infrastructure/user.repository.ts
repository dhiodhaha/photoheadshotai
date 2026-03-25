import { prisma } from "#/lib/prisma";

const USER_PROFILE_SELECT = {
	id: true,
	name: true,
	email: true,
	image: true,
	currentCredits: true,
	referralCode: true,
	createdAt: true,
} as const;

export async function getUserById(userId: string) {
	return prisma.user.findUnique({
		where: { id: userId },
		select: USER_PROFILE_SELECT,
	});
}

export async function updateUser(userId: string, data: { name?: string }) {
	return prisma.user.update({
		where: { id: userId },
		data,
		select: USER_PROFILE_SELECT,
	});
}
