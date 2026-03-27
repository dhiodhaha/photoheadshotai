import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useRef, useState } from "react";
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
	const [isVisible, setIsVisible] = useState(true);
	const lastScrollTop = useRef(0);

	const handleScroll = (e: React.UIEvent<HTMLElement>) => {
		const scrollTop = e.currentTarget.scrollTop;

		// Handle auto-hide (hide on scroll down, show on scroll up)
		// "Normal scroll" behavior by hiding immediately on down-scroll
		if (scrollTop > lastScrollTop.current && scrollTop > 40) {
			setIsVisible(false);
		} else {
			setIsVisible(true);
		}

		lastScrollTop.current = scrollTop;
	};

	return (
		<div className="h-dvh bg-transparent text-foreground flex flex-col overflow-hidden w-full">
			<div className="flex-1 flex flex-col relative z-10 h-dvh overflow-hidden min-w-0">
				<StudioHeader isVisible={isVisible} />

				<main
					className="flex-1 overflow-y-auto relative w-full pt-0"
					onScroll={handleScroll}
				>
					<Outlet />
				</main>
			</div>
		</div>
	);
}
