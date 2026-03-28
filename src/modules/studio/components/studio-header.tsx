import { Link, useLocation } from "@tanstack/react-router";
import { Bolt, ChevronLeft, Plus, Sparkles } from "lucide-react";
import { authClient } from "#/lib/auth-client";
import { cn } from "#/lib/utils";
import { UserDropdownMenu } from "./user-dropdown-menu";

type StudioHeaderProps = {
	isVisible?: boolean;
};

export function StudioHeader({ isVisible = true }: StudioHeaderProps) {
	const credits = authClient.useSession().data?.user?.currentCredits ?? 0;
	const location = useLocation();

	const isSecondaryView =
		location.pathname.includes("/settings") ||
		location.pathname.includes("/billing");

	return (
		<header
			className={cn(
				"fixed top-0 left-0 right-0 h-16 md:h-20 flex items-center justify-between px-4 md:px-12 shrink-0 transition-transform duration-500 ease-in-out z-50 bg-transparent",
				isVisible ? "translate-y-0" : "-translate-y-full",
			)}
		>
			<div className="flex items-center gap-4">
				{isSecondaryView && (
					<Link
						to="/studio"
						className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group flex items-center justify-center -ml-2"
					>
						<ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-white transition-colors" />
					</Link>
				)}

				<Link
					to="/studio"
					className="flex items-center gap-2 group transition-opacity hover:opacity-80"
				>
					<div className="w-8 h-8 rounded-xl bg-linear-to-br from-primary to-primary/50 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
						<Sparkles className="w-5 h-5 text-white" />
					</div>
					<div className="flex flex-col">
						<span className="text-sm font-display font-bold tracking-tight text-white leading-none">
							Studio <span className="text-primary">AI</span>
						</span>
						<span className="text-[8px] font-bold tracking-[0.2em] text-muted-foreground uppercase mt-0.5">
							Genesis
						</span>
					</div>
				</Link>
			</div>

			<div className="flex items-center gap-3 md:gap-6">
				<div className="flex items-center gap-2 md:gap-3 glass px-1 py-1 rounded-full border border-white/10">
					<div className="flex items-center gap-1.5 md:gap-2 bg-primary/20 text-primary px-3 md:px-4 py-1.5 rounded-full">
						<Bolt className="w-3.5 h-3.5 md:w-4 md:h-4" />
						<span className="text-[10px] md:text-xs font-bold tracking-wider">
							{credits} <span className="hidden sm:inline">CREDITS</span>
						</span>
					</div>
					<Link
						to="/studio/billing"
						className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors ml-0.5 md:ml-1 text-white mr-1 shrink-0"
					>
						<Plus className="w-3 h-3 md:w-4 md:h-4" />
					</Link>
				</div>

				<UserDropdownMenu />
			</div>
		</header>
	);
}
