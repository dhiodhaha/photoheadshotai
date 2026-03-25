import { prisma } from "#/lib/prisma";

export async function updateUser(userId: string, data: { name?: string }) {
	return prisma.user.update({
		where: { id: userId },
		data,
		select: {
			id: true,
			name: true,
			email: true,
			image: true,
			currentCredits: true,
			referralCode: true,
			createdAt: true,
		},
	});
}
