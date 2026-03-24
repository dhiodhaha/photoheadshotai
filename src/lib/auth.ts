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
		afterEmailVerification: async (user) => {
			// Award referrer credits when new user verifies email
			if (user.referredBy) {
				const { rewardReferrerOnVerification } = await import(
					"#/modules/referral"
				);
				await rewardReferrerOnVerification(user.referredBy, user.id);
			}
		},
	},
	databaseHooks: {
		user: {
			create: {
				before: async (user) => {
					// Block disposable emails
					const { isDisposableEmail } = await import(
						"#/modules/auth/infrastructure/disposable-email"
					);
					if (isDisposableEmail(user.email)) {
						throw new APIError("BAD_REQUEST", {
							message:
								"Disposable email addresses are not allowed. Please use a permanent email.",
						});
					}

					// Admin domain bypass — standoutheadshot.com can register without referral
					const emailDomain = user.email.split("@")[1]?.toLowerCase();
					const isAdminDomain = emailDomain === "standoutheadshot.com";

					if (!isAdminDomain) {
						// Require referral code for everyone else
						const code = (user as Record<string, unknown>).referralCode as
							| string
							| undefined;
						if (!code || code.trim() === "") {
							throw new APIError("BAD_REQUEST", {
								message: "A referral code is required to sign up.",
							});
						}

						// Validate referral code
						const { validateReferralCode } = await import("#/modules/referral");
						const result = await validateReferralCode(code.trim());
						if (!result.valid) {
							throw new APIError("BAD_REQUEST", { message: result.reason });
						}

						// Store referrerId on user if it's a user referral code
						if (result.type === "referral") {
							(user as Record<string, unknown>).referredBy = result.referrerId;
						}
					}
				},
				after: async (user) => {
					// Process bootstrap redemption (only if referral code was used)
					const code = (user as Record<string, unknown>).referralCode as
						| string
						| undefined;
					if (!code) return;

					const { validateReferralCode, processSignupCode } = await import(
						"#/modules/referral"
					);
					const result = await validateReferralCode(code.trim());
					await processSignupCode(result, user.id);
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
			referralCode: {
				type: "string",
				defaultValue: "",
				input: true,
			},
			referredBy: {
				type: "string",
				required: false,
				input: true,
			},
		},
	},
	plugins: [tanstackStartCookies()],
});
