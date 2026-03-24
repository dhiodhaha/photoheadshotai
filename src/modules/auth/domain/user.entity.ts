export interface User {
	id: string;
	name: string;
	email: string;
	emailVerified: boolean;
	image: string | null;
	createdAt: Date;
	updatedAt: Date;
}

// Domains that can register without a referral code (still require email verification)
export const ADMIN_DOMAINS = new Set(["standoutheadshot.com"]);
