import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { getSessionFn } from "#/modules/auth/infrastructure/auth.functions";
import { StudioHeader } from "#/modules/studio/components/studio-header";
import { StudioSidebar } from "#/modules/studio/components/studio-sidebar";

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
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	return (
		<div className="h-dvh bg-transparent text-foreground flex overflow-hidden w-full">
			<StudioSidebar
				isOpen={isMobileMenuOpen}
				onClose={() => setIsMobileMenuOpen(false)}
			/>

			<div className="flex-1 flex flex-col relative z-10 h-dvh overflow-hidden min-w-0">
				<StudioHeader onMenuOpen={() => setIsMobileMenuOpen(true)} />

				<main className="flex-1 overflow-y-auto relative w-full">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
