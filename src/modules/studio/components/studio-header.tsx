import { Link } from "@tanstack/react-router";
import { Bolt, Menu, Plus } from "lucide-react";
import { authClient } from "#/lib/auth-client";
import { UserDropdownMenu } from "./user-dropdown-menu";

interface StudioHeaderProps {
	onMenuOpen: () => void;
}

export function StudioHeader({ onMenuOpen }: StudioHeaderProps) {
	return (
		<header className="h-16 md:h-20 border-b border-white/5 flex items-center justify-between md:justify-end px-4 md:px-12 shrink-0 bg-background/30 backdrop-blur-sm relative z-30">
			{/* Hamburger Menu Toggle (Mobile Only) */}
			<button
				type="button"
				className="md:hidden text-white/80 hover:text-white transition-colors"
				onClick={onMenuOpen}
			>
				<Menu className="w-6 h-6" />
			</button>

			<div className="flex items-center gap-3 md:gap-6 ml-auto">
				{/* Credits Badge */}
				<div className="flex items-center gap-2 md:gap-3 glass px-1 py-1 rounded-full border border-white/10">
					<div className="flex items-center gap-1.5 md:gap-2 bg-primary/20 text-primary px-3 md:px-4 py-1.5 rounded-full">
						<Bolt className="w-3.5 h-3.5 md:w-4 md:h-4" />
						<span className="text-[10px] md:text-xs font-bold tracking-wider">
							{(authClient.useSession().data?.user as any)
								?.currentCredits ?? 0}{" "}
							<span className="hidden sm:inline">CREDITS</span>
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
