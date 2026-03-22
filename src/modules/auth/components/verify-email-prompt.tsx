import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LogOut, Mail, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { authClient } from "#/lib/auth-client";
import { Button } from "@/components/ui/button";

interface VerifyEmailPromptProps {
	email: string;
}

export function VerifyEmailPrompt({ email }: VerifyEmailPromptProps) {
	const navigate = useNavigate();
	const [cooldown, setCooldown] = useState(0);
	const [isSending, setIsSending] = useState(false);

	const handleSignOut = async () => {
		await authClient.signOut();
		navigate({ to: "/auth/signin" });
	};

	useEffect(() => {
		if (cooldown <= 0) return;
		const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
		return () => clearTimeout(timer);
	}, [cooldown]);

	const handleResend = async () => {
		if (cooldown > 0) return;
		setIsSending(true);
		try {
			await authClient.sendVerificationEmail({
				email,
				callbackURL: "/studio",
			});
			setCooldown(60);
		} catch (_error: unknown) {
			// Better Auth may throttle — fail silently
		} finally {
			setIsSending(false);
		}
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className="flex flex-col items-center text-center space-y-6 max-w-md mx-auto"
		>
			<div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
				<Mail className="w-8 h-8 text-primary" />
			</div>
			<div className="space-y-2">
				<h2 className="text-2xl font-display font-bold">Check your inbox</h2>
				<p className="text-muted-foreground text-sm">
					We sent a verification link to{" "}
					<span className="text-white font-medium">{email}</span>. Click the
					link to activate your studio.
				</p>
			</div>
			<Button
				type="button"
				variant="outline"
				onClick={handleResend}
				disabled={cooldown > 0 || isSending}
				className="rounded-full px-6"
			>
				<RefreshCw
					className={`w-4 h-4 mr-2 ${isSending ? "animate-spin" : ""}`}
				/>
				{cooldown > 0 ? `Resend in ${cooldown}s` : "Resend verification email"}
			</Button>
			<p className="text-xs text-muted-foreground">
				Check your spam folder if you don't see it within a few minutes.
			</p>
			<div className="flex items-center gap-4 pt-2">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => navigate({ to: "/auth/signup" })}
					className="text-muted-foreground hover:text-white"
				>
					<ArrowLeft className="w-4 h-4 mr-1" />
					Back to Sign Up
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={handleSignOut}
					className="text-muted-foreground hover:text-white"
				>
					<LogOut className="w-4 h-4 mr-1" />
					Sign Out
				</Button>
			</div>
		</motion.div>
	);
}
