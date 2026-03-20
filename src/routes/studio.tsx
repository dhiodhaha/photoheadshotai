import { createFileRoute, Outlet, Link, useRouterState } from '@tanstack/react-router';
import { Home, Sparkles, Image as ImageIcon, Settings, Bolt, Plus, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/studio')({
	component: StudioLayout,
});

const navItems = [
	{ icon: Home, label: 'Home', to: '/' },
	{ icon: Sparkles, label: 'Studio AI', to: '/studio' },
	{ icon: ImageIcon, label: 'Gallery', to: '/studio/gallery' },
	{ icon: Settings, label: 'Settings', to: '/studio/settings' },
];

function StudioLayout() {
	const routerState = useRouterState();
	const currentPath = routerState.location.pathname;

	return (
		<div className="min-h-screen bg-transparent text-foreground flex overflow-hidden">

			{/* Sidebar */}
			<aside className="w-64 flex flex-col justify-between py-8 px-6 border-r border-white/5 relative z-10 bg-background/50 backdrop-blur-md">
				<div className="space-y-12">
					<Link to="/" className="font-display text-2xl font-bold tracking-tight text-white inline-block">
						Studio AI
					</Link>

					<nav className="space-y-2">
						{navItems.map((item) => {
							const isActive = currentPath === item.to || (item.to !== '/' && currentPath.startsWith(item.to) && item.to !== '/studio' || currentPath === '/studio' && item.to === '/studio');
							return (
								<Link
									key={item.label}
									to={item.to}
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
			<div className="flex-1 flex flex-col relative z-10 h-screen overflow-hidden">
				{/* Top Bar */}
				<header className="h-20 border-b border-white/5 flex items-center justify-end px-12 shrink-0 bg-background/30 backdrop-blur-sm">
					<div className="flex items-center gap-6">
						{/* Credits Badges */}
						<div className="flex items-center gap-3 glass px-1 py-1 rounded-full border border-white/10">
                            <div className="flex items-center gap-2 bg-primary/20 text-primary px-3 py-1.5 rounded-full">
                                <Bolt className="w-4 h-4" />
                                <span className="text-xs font-bold tracking-wider">CREDITS 50</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 text-muted-foreground">
                                <div className="w-4 h-4 rounded-full bg-linear-to-tr from-accent to-primary" />
                                <span className="text-xs font-bold tracking-wider">BALANCE 0 TOKENS</span>
                                <button className="w-5 h-5 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors ml-1">
                                    <Plus className="w-3 h-3 text-white" />
                                </button>
                            </div>
						</div>
                        
                        {/* Profile Avatar */}
                        <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors">
                            <User className="w-5 h-5 text-muted-foreground" />
                        </div>
					</div>
				</header>

				{/* Page Content */}
				<main className="flex-1 overflow-y-auto relative">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
