import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { prisma } from "#/lib/prisma";

export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
	},
	emailVerification: {
		sendOnSignUp: true,
		sendVerificationEmail: async ({ user, url }) => {
			const { sendEmail } = await import(
				"#/modules/auth/infrastructure/email.server"
			);
			const { buildVerificationEmailHtml } = await import(
				"#/modules/auth/infrastructure/email-templates"
			);
			await sendEmail(
				user.email,
				"Verify your email — Studio AI",
				buildVerificationEmailHtml(user.name, url),
			);
		},
	},
	databaseHooks: {
		user: {
			create: {
				before: async (user) => {
					const { isDisposableEmail } = await import(
						"#/modules/auth/infrastructure/disposable-email"
					);
					if (isDisposableEmail(user.email)) {
						throw new APIError("BAD_REQUEST", {
							message:
								"Disposable email addresses are not allowed. Please use a permanent email.",
						});
					}
				},
			},
		},
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
