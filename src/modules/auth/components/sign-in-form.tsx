import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "#/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignInForm() {
	const navigate = useNavigate();
	const [isLoading, setIsLoading] = useState(false);
	const [formData, setFormData] = useState({
		email: "",
		password: "",
	});

	const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			const { error } = await authClient.signIn.email({
				email: formData.email,
				password: formData.password,
				callbackURL: "/studio",
			});

			if (error) {
				toast.error(error.message || "Check your credentials and try again.");
			} else {
				toast.success("Welcome back to the Studio");
				navigate({ to: "/studio" });
			}
		} catch (_err) {
			toast.error("An unexpected error occurred");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex items-center justify-center p-8 bg-background relative z-10">
			<div className="absolute inset-0 noise-overlay pointer-events-none opacity-20" />

			<motion.div
				initial={{ opacity: 0, x: 20 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.8, delay: 0.2 }}
				className="w-full max-w-sm space-y-12"
			>
				<div className="space-y-4">
					<h1 className="text-4xl font-display tracking-tight">
						Sign in to Studio
					</h1>
					<p className="text-muted-foreground font-light leading-relaxed">
						Resume your journey towards the perfect professional presence.
					</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-8">
					<div className="space-y-6">
						<div className="space-y-2">
							<Label
								htmlFor="email"
								className="text-[10px] uppercase tracking-widest text-muted-foreground"
							>
								Email Address
							</Label>
							<Input
								id="email"
								type="email"
								placeholder="studio@example.com"
								className="rounded-none border-0 border-b border-white/10 bg-transparent px-2 h-10 focus-visible:ring-0 focus-visible:border-primary transition-colors text-lg"
								required
								value={formData.email}
								onChange={(e) =>
									setFormData({ ...formData, email: e.target.value })
								}
							/>
						</div>
						<div className="space-y-2">
							<div className="flex justify-between items-center">
								<Label
									htmlFor="password"
									className="text-[10px] uppercase tracking-widest text-muted-foreground"
								>
									Password
								</Label>
								<Link
									to="/"
									className="text-[10px] uppercase tracking-widest text-primary hover:underline underline-offset-4"
								>
									Forgot Password?
								</Link>
							</div>
							<Input
								id="password"
								type="password"
								placeholder="••••••••"
								className="rounded-none border-0 border-b border-white/10 bg-transparent px-2 h-10 focus-visible:ring-0 focus-visible:border-primary transition-colors text-lg"
								required
								value={formData.password}
								onChange={(e) =>
									setFormData({ ...formData, password: e.target.value })
								}
							/>
						</div>
					</div>

					<Button
						type="submit"
						className="w-full h-14 rounded-full text-lg group bg-primary text-primary-foreground"
						disabled={isLoading}
					>
						{isLoading ? (
							<Loader2 className="w-5 h-5 animate-spin" />
						) : (
							<>
								Access Studio
								<ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
							</>
						)}
					</Button>
				</form>

				<div className="pt-8 border-t border-white/5 text-center">
					<p className="text-sm text-muted-foreground">
						Not a member yet?{" "}
						<Link
							to="/auth/signup"
							className="text-primary hover:underline underline-offset-4 font-medium"
						>
							Create Account
						</Link>
					</p>
				</div>
			</motion.div>
		</div>
	);
}
