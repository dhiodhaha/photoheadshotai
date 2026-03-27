import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSessionFn } from "#/modules/auth/infrastructure/auth.functions";
import { StudioHeader } from "#/modules/studio/components/studio-header";

export const Route = createFileRoute("/studio")({
	beforeLoad: async () => {
		const session = await getSessionFn();
		if (!session) {
			throw redirect({
				to: "/auth/signin",
			});
		}
		if (!session.user.emailVerified) {
			throw redirect({
				to: "/auth/verify-email",
				search: { email: session.user.email },
			});
		}
		return { session };
	},
	component: StudioLayout,
});

function StudioLayout() {
	return (
		<div className="h-dvh bg-transparent text-foreground flex flex-col overflow-hidden w-full">
			<div className="flex-1 flex flex-col relative z-10 h-dvh overflow-hidden min-w-0">
				<StudioHeader />

				<main className="flex-1 overflow-y-auto relative w-full">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
