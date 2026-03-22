import disposableDomains from "disposable-email-domains";

const blocklist = new Set<string>(disposableDomains);

export function isDisposableEmail(email: string): boolean {
	const domain = email.split("@")[1]?.toLowerCase();
	if (!domain) return false;
	return blocklist.has(domain);
}
