import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod/v4";
import { AuthLeftPanel } from "#/modules/auth/components/auth-left-panel";
import { SignUpForm } from "#/modules/auth/components/sign-up-form";
import { getSessionFn } from "#/modules/auth/infrastructure/auth.functions";

export const Route = createFileRoute("/auth/signup")({
	validateSearch: z.object({
		code: z.string().optional(),
	}),
	beforeLoad: async () => {
		const session = await getSessionFn();
		if (session) {
			throw redirect({ to: "/studio" });
		}
	},
	component: SignUpPage,
});

function SignUpPage() {
	const { code } = Route.useSearch();

	return (
		<main className="min-h-screen grid lg:grid-cols-2 bg-background overflow-hidden">
			<AuthLeftPanel
				imageSrc="/auth_fashion_portrait_1.png"
				quote={`"Your image is your most powerful <br />silent advocate."`}
			/>
			<SignUpForm initialCode={code ?? ""} />
		</main>
	);
}
