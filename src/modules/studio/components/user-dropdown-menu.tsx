import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Settings, User } from "lucide-react";
import { authClient } from "#/lib/auth-client";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserDropdownMenu() {
	const navigate = useNavigate();

	const handleSignOut = async () => {
		await authClient.signOut({
			fetchOptions: {
				onSuccess: () => {
					navigate({ to: "/auth/signin" });
				},
			},
		});
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors outline-none focus-visible:ring-1 focus-visible:ring-primary"
				>
					<User className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="w-56 glass bg-background/90 backdrop-blur-xl border-white/10 text-white mt-2 p-2"
			>
				<DropdownMenuLabel className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground opacity-70">
					My Account
				</DropdownMenuLabel>
				<DropdownMenuSeparator className="bg-white/10 my-2" />
				<DropdownMenuItem
					className="focus:bg-white/10 focus:text-white cursor-pointer py-2.5 rounded-xl transition-colors"
					asChild
				>
					<Link
						to="/studio/settings"
						className="w-full flex items-center font-medium"
					>
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
	);
}
