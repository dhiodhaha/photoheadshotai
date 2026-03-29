import { randomBytes } from "node:crypto";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { prisma } from "#/lib/prisma";

// Bridges the entered referral code from before → after hook.
// before() validates it; after() processes the redemption using user.id.
// Keyed by email (unique per signup attempt), cleaned up in after().
const _pendingRedemptions = new Map<string, string>();

function generateReferralCode(): string {
	return randomBytes(4).toString("hex").toUpperCase(); // e.g. "A3F2B1C4"
}

export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],
	advanced: {
		useSecureCookies: process.env.NODE_ENV === "production",
	},
	rateLimit: {
		enabled: true,
		window: 60, // 60-second window
		max: 10, // max 10 auth requests per window per IP
		storage: "memory", // in-process — no DB table needed, fine for single-instance VPS
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // refresh session token daily
		cookieCache: {
			enabled: true,
			maxAge: 60 * 5, // 5-minute client-side cache to reduce DB reads
		},
	},
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
		sendResetPassword: async ({ user, url }) => {
			const { sendPasswordResetEmail } = await import(
				"#/modules/auth/infrastructure/email.server"
			);
			await sendPasswordResetEmail(user.email, user.name, url);
		},
	},
	emailVerification: {
		sendOnSignUp: true,
		sendVerificationEmail: async ({ user, url }) => {
			const { sendVerificationEmail } = await import(
				"#/modules/auth/infrastructure/email.server"
			);
			await sendVerificationEmail(user.email, user.name, url);
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

					const enteredCode = (user as Record<string, unknown>).referralCode as
						| string
						| undefined;

					// Admin domain bypass — no referral code required, email verification still enforced
					const { isAdminDomain } = await import(
						"#/modules/auth/infrastructure/admin-domain"
					);
					if (!isAdminDomain(user.email)) {
						if (enteredCode && enteredCode.trim() !== "") {
							// Validate referral code if provided
							const { validateReferralCode } = await import(
								"#/modules/referral"
							);
							const result = await validateReferralCode(enteredCode.trim());
							if (!result.valid) {
								throw new APIError("BAD_REQUEST", { message: result.reason });
							}

							// Store referrerId on user if it's a user referral code
							if (result.type === "referral") {
								(user as Record<string, unknown>).referredBy =
									result.referrerId;
							}

							// Save entered code for after() to process the redemption
							_pendingRedemptions.set(user.email, enteredCode.trim());
						}
					}

					// Replace the entered code with the user's own unique shareable referral code.
					// Without this, Better Auth stores "" (defaultValue) and violates the unique constraint.
					(user as Record<string, unknown>).referralCode =
						generateReferralCode();
				},
				after: async (user) => {
					const enteredCode = _pendingRedemptions.get(user.email);
					_pendingRedemptions.delete(user.email);
					if (!enteredCode) return;

					const { validateReferralCode, processSignupCode } = await import(
						"#/modules/referral"
					);
					const result = await validateReferralCode(enteredCode);
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
				// input: true kept so Better Auth accepts it from signup form.
				// The before() hook replaces this value with a generated unique code
				// before it reaches the DB; the entered value is bridged via _pendingRedemptions.
				input: true,
			},
			referredBy: {
				type: "string",
				required: false,
				// input: false (default) — never accept from client.
				// Set programmatically in databaseHooks.user.create.before only.
			},
		},
	},
	plugins: [tanstackStartCookies()],
});
