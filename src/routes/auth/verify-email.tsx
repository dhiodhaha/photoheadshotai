import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod/v4";
import { AuthLeftPanel } from "#/modules/auth/components/auth-left-panel";
import { VerifyEmailPrompt } from "#/modules/auth/components/verify-email-prompt";

const searchSchema = z.object({
	email: z.string().email().optional(),
});

export const Route = createFileRoute("/auth/verify-email")({
	validateSearch: searchSchema,
	component: VerifyEmailPage,
});

function VerifyEmailPage() {
	const { email } = Route.useSearch();
	return (
		<div className="flex min-h-dvh">
			<AuthLeftPanel />
			<div className="flex-1 flex items-center justify-center p-8">
				<VerifyEmailPrompt email={email ?? ""} />
			</div>
		</div>
	);
}
