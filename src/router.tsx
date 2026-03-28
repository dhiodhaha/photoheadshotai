import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { NotFound } from "./components/not-found";
import { getContext } from "./integrations/tanstack-query/root-provider";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const router = createTanStackRouter({
		routeTree,

		context: getContext(),

		scrollRestoration: true,
		defaultPreload: "intent",
		// Reuse preloaded data for 30s so hovering → clicking doesn't re-fetch
		defaultPreloadStaleTime: 30_000,
		defaultNotFoundComponent: NotFound,
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
