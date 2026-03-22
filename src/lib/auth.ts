import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { prisma } from "#/lib/prisma";

export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	emailAndPassword: {
		enabled: true,
	},
	user: {
		additionalFields: {
			currentCredits: {
				type: "number",
				defaultValue: 0,
			},
		},
	},
	plugins: [tanstackStartCookies()],
});
