import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSessionFn } from "#/modules/auth/infrastructure/auth.functions";
import { AuthLeftPanel } from "#/modules/auth/components/auth-left-panel";
import { SignInForm } from "#/modules/auth/components/sign-in-form";

export const Route = createFileRoute("/auth/signin")({
	beforeLoad: async () => {
		const session = await getSessionFn();
		if (session) {
			throw redirect({
				to: "/studio",
			});
		}
	},
	component: SignInPage,
});

function SignInPage() {
	return (
		<main className="min-h-screen grid lg:grid-cols-2 bg-background overflow-hidden">
			<AuthLeftPanel
				imageSrc="/auth_fashion_portrait_2.png"
				quote={`"Excellence is not an act, <br />but a habit."`}
			/>
			<SignInForm />
		</main>
	);
}
