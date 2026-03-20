import { createFileRoute, Outlet, Link, useRouterState, useNavigate, redirect } from '@tanstack/react-router';
import { Home, Sparkles, Image as ImageIcon, Settings, Bolt, Plus, User, CreditCard, Menu, X, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { authClient } from '#/lib/auth-client';
import { getSessionFn } from '#/modules/auth/infrastructure/auth.functions';

export const Route = createFileRoute('/studio')({
	beforeLoad: async () => {
		const session = await getSessionFn();
		if (!session) {
			throw redirect({
				to: '/auth/signin',
			});
		}
		return { session };
	},
	component: StudioLayout,
});

const navItems = [
	{ icon: Home, label: 'Home', to: '/' },
	{ icon: Sparkles, label: 'Studio AI', to: '/studio' },
	{ icon: ImageIcon, label: 'Gallery', to: '/studio/gallery' },
	{ icon: CreditCard, label: 'Billing', to: '/studio/billing' },
	{ icon: Settings, label: 'Settings', to: '/studio/settings' },
];

function StudioLayout() {
	const routerState = useRouterState();
	const navigate = useNavigate();
	const currentPath = routerState.location.pathname;
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	const handleSignOut = async () => {
		await authClient.signOut({
			fetchOptions: {
				onSuccess: () => {
					navigate({ to: '/auth/signin' });
				}
			}
		});
	};

	return (
		<div className="h-dvh bg-transparent text-foreground flex overflow-hidden w-full">

            {/* Mobile Sidebar Backdrop */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

			{/* Sidebar */}
			<aside className={cn(
                "fixed inset-y-0 left-0 w-64 md:w-64 shrink-0 flex flex-col justify-between py-8 px-6 border-r border-white/5 z-50 bg-background/80 backdrop-blur-xl md:backdrop-blur-md transition-transform duration-300 ease-in-out md:relative md:translate-x-0 h-dvh",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
				<div className="space-y-12">
                    <div className="flex items-center justify-between">
                        <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="font-display text-2xl font-bold tracking-tight text-white inline-block">
                            Studio AI
                        </Link>
                        {/* Close button for mobile */}
                        <button 
                            className="md:hidden text-white/70 hover:text-white"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

					<nav className="space-y-2">
						{navItems.map((item) => {
							const isActive = currentPath === item.to || (item.to !== '/' && currentPath.startsWith(item.to) && item.to !== '/studio' || currentPath === '/studio' && item.to === '/studio');
							return (
								<Link
									key={item.label}
									to={item.to}
                                    onClick={() => setIsMobileMenuOpen(false)}
									className={cn(
										"flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group",
										isActive 
											? "bg-white/10 text-white" 
											: "text-muted-foreground hover:bg-white/5 hover:text-white"
									)}
								>
									<item.icon className={cn("w-5 h-5 transition-transform duration-300", isActive ? "scale-110 text-primary" : "group-hover:scale-110")} />
									<span className="font-medium text-sm tracking-wide">{item.label}</span>
								</Link>
							);
						})}
					</nav>
				</div>
                
                {/* User compact profile or status */}
                <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold opacity-50 px-4">
                    Beta Access
                </div>
			</aside>

			{/* Main Content Area */}
			<div className="flex-1 flex flex-col relative z-10 h-dvh overflow-hidden min-w-0">
				{/* Top Bar */}
				<header className="h-16 md:h-20 border-b border-white/5 flex items-center justify-between md:justify-end px-4 md:px-12 shrink-0 bg-background/30 backdrop-blur-sm relative z-30">
					
                    {/* Hamburger Menu Toggle (Mobile Only) */}
                    <button 
                        className="md:hidden text-white/80 hover:text-white transition-colors"
                        onClick={() => setIsMobileMenuOpen(true)}
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    <div className="flex items-center gap-3 md:gap-6 ml-auto">
						{/* Credits Badges */}
						<div className="flex items-center gap-2 md:gap-3 glass px-1 py-1 rounded-full border border-white/10">
                            <div className="flex items-center gap-1.5 md:gap-2 bg-primary/20 text-primary px-3 md:px-4 py-1.5 rounded-full">
                                <Bolt className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                <span className="text-[10px] md:text-xs font-bold tracking-wider">50 <span className="hidden sm:inline">CREDITS</span></span>
                            </div>
                            <Link to="/studio/billing" className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors ml-0.5 md:ml-1 text-white mr-1 shrink-0">
                                <Plus className="w-3 h-3 md:w-4 md:h-4" />
                            </Link>
						</div>
                        
                        {/* Profile Avatar with Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors outline-none focus-visible:ring-1 focus-visible:ring-primary">
                                    <User className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 glass bg-background/90 backdrop-blur-xl border-white/10 text-white mt-2 p-2">
                                <DropdownMenuLabel className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground opacity-70">My Account</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-white/10 my-2" />
                                <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer py-2.5 rounded-xl transition-colors" asChild>
                                    <Link to="/studio/settings" className="w-full flex items-center font-medium">
                                        <Settings className="mr-3 w-4 h-4 text-muted-foreground" />
                                        <span>Settings</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
									onClick={handleSignOut}
									className="focus:bg-red-500/20 focus:text-red-500 text-red-500 cursor-pointer py-2.5 rounded-xl transition-colors mt-1"
								>
                                    <LogOut className="mr-3 w-4 h-4" />
                                    <span className="font-bold">Sign Out Securely</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
					</div>
				</header>

				{/* Page Content */}
				<main className="flex-1 overflow-y-auto relative w-full">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
