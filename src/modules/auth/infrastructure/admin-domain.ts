import { ADMIN_DOMAINS } from "../domain/user.entity";

export function isAdminDomain(email: string): boolean {
	const domain = email.split("@")[1]?.toLowerCase();
	if (!domain) return false;
	return ADMIN_DOMAINS.has(domain);
}
