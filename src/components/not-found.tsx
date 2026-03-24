import { Link } from "@tanstack/react-router";

export function NotFound() {
	return (
		<main className="min-h-screen flex flex-col items-center justify-center gap-6 text-center px-6">
			<p className="text-8xl font-display font-bold text-muted-foreground/20">
				404
			</p>
			<h1 className="text-2xl font-display font-semibold tracking-tight">
				Page not found
			</h1>
			<p className="text-muted-foreground text-sm max-w-xs">
				The page you're looking for doesn't exist or has been moved.
			</p>
			<Link
				to="/"
				className="text-sm font-medium underline underline-offset-4 hover:text-primary transition-colors"
			>
				Back to home
			</Link>
		</main>
	);
}
