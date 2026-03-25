import { Link, useRouterState } from "@tanstack/react-router";
import {
	CreditCard,
	Home,
	Image as ImageIcon,
	Settings,
	Sparkles,
	Trash2,
	X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
	{ icon: Home, label: "Home", to: "/" },
	{ icon: Sparkles, label: "Studio AI", to: "/studio" },
	{ icon: ImageIcon, label: "Gallery", to: "/studio/gallery" },
	{ icon: Trash2, label: "Trash", to: "/studio/trash" },
	{ icon: CreditCard, label: "Billing", to: "/studio/billing" },
	{ icon: Settings, label: "Settings", to: "/studio/settings" },
];

interface StudioSidebarProps {
	isOpen: boolean;
	onClose: () => void;
}

export function StudioSidebar({ isOpen, onClose }: StudioSidebarProps) {
	const routerState = useRouterState();
	const currentPath = routerState.location.pathname;

	return (
		<>
			{/* Mobile Backdrop */}
			{isOpen && (
				<button
					type="button"
					className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 md:hidden w-full h-full border-none p-0"
					onClick={onClose}
					aria-label="Close mobile menu"
				/>
			)}

			{/* Sidebar */}
			<aside
				className={cn(
					"fixed inset-y-0 left-0 w-64 md:w-64 shrink-0 flex flex-col justify-between py-8 px-6 border-r border-white/5 z-50 bg-background/80 backdrop-blur-xl md:backdrop-blur-md transition-transform duration-300 ease-in-out md:relative md:translate-x-0 h-dvh",
					isOpen ? "translate-x-0" : "-translate-x-full",
				)}
			>
				<div className="space-y-12">
					<div className="flex items-center justify-between">
						<Link
							to="/"
							onClick={onClose}
							className="font-display text-2xl font-bold tracking-tight text-white inline-block"
						>
							Studio AI
						</Link>
						<button
							type="button"
							className="md:hidden text-white/70 hover:text-white"
							onClick={onClose}
						>
							<X className="w-6 h-6" />
						</button>
					</div>

					<nav className="space-y-2">
						{navItems.map((item) => {
							const isActive =
								currentPath === item.to ||
								(item.to !== "/" &&
									currentPath.startsWith(item.to) &&
									item.to !== "/studio") ||
								(currentPath === "/studio" && item.to === "/studio");
							return (
								<Link
									key={item.label}
									to={item.to}
									onClick={onClose}
									className={cn(
										"flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group",
										isActive
											? "bg-white/10 text-white"
											: "text-muted-foreground hover:bg-white/5 hover:text-white",
									)}
								>
									<item.icon
										className={cn(
											"w-5 h-5 transition-transform duration-300",
											isActive
												? "scale-110 text-primary"
												: "group-hover:scale-110",
										)}
									/>
									<span className="font-medium text-sm tracking-wide">
										{item.label}
									</span>
								</Link>
							);
						})}
					</nav>
				</div>

				<div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold opacity-50 px-4">
					Beta Access
				</div>
			</aside>
		</>
	);
}
