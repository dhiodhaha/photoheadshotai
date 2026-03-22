import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "#/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignUpForm() {
	const navigate = useNavigate();
	const [isLoading, setIsLoading] = useState(false);
	const [formData, setFormData] = useState({
		name: "",
		email: "",
		password: "",
	});

	const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			const { error } = await authClient.signUp.email({
				email: formData.email,
				password: formData.password,
				name: formData.name,
				callbackURL: "/studio",
			});

			if (error) {
				toast.error(error.message || "Failed to create account");
			} else {
				toast.success("Please check your email to verify your account");
				navigate({
					to: "/auth/verify-email",
					search: { email: formData.email },
				});
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
						Create your account
					</h1>
					<p className="text-muted-foreground font-light leading-relaxed">
						Join the elite circle of professionals refining their digital
						presence.
					</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-8">
					<div className="space-y-6">
						<div className="space-y-2">
							<Label
								htmlFor="name"
								className="text-[10px] uppercase tracking-widest text-muted-foreground"
							>
								Legal Name
							</Label>
							<Input
								id="name"
								placeholder="Alexander McQueen"
								className="rounded-none border-0 border-b border-white/10 bg-transparent px-2 h-10 focus-visible:ring-0 focus-visible:border-primary transition-colors text-lg"
								required
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
							/>
						</div>
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
							<Label
								htmlFor="password"
								className="text-[10px] uppercase tracking-widest text-muted-foreground"
							>
								Password
							</Label>
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
								Begin Session
								<ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
							</>
						)}
					</Button>
				</form>

				<div className="pt-8 border-t border-white/5 text-center">
					<p className="text-sm text-muted-foreground">
						Already a member?{" "}
						<Link
							to="/auth/signin"
							className="text-primary hover:underline underline-offset-4 font-medium"
						>
							Sign In
						</Link>
					</p>
				</div>
			</motion.div>
		</div>
	);
}
