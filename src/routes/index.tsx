import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, Camera, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: App });

function App() {
	return (
		<main className="relative min-h-screen overflow-hidden selection:bg-primary selection:text-primary-foreground">
			{/* Header */}
			<header className="fixed top-0 z-40 w-full px-6 py-8 flex justify-between items-center mix-blend-difference">
				<Link
					to="/"
					className="font-display text-2xl font-bold tracking-tight text-white focus:outline-hidden"
				>
					Studio AI
				</Link>
				<nav className="flex gap-8 items-center">
					<Link
						to="/auth/signin"
						className="text-sm font-medium tracking-wide uppercase text-white/80 hover:text-white transition-colors"
					>
						Sign In
					</Link>
					<Button
						variant="secondary"
						size="sm"
						className="rounded-full px-6 uppercase tracking-widest text-[10px]"
						asChild
					>
						<Link to="/auth/signup">Get Started</Link>
					</Button>
				</nav>
			</header>

			{/* Hero Section */}
			<div className="relative pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col md:flex-row gap-12 items-center min-h-screen">
				<div className="flex-1 space-y-12">
					<motion.div
						initial={{ opacity: 0, y: 40 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
						className="space-y-6"
					>
						<h1 className="text-6xl md:text-8xl lg:text-9xl leading-[0.9] font-medium tracking-tight">
							Your <span className="italic">Digital</span>
							<br />
							Success <span className="text-muted-foreground">Studio</span>
						</h1>
						<p className="max-w-md text-lg md:text-xl text-muted-foreground leading-relaxed font-light">
							Transform your professional identity with cinematic AI headshots. 
							Crafted for high-performing individuals who demand excellence in every pixel.
						</p>
					</motion.div>

					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.6, duration: 1.5 }}
						className="flex flex-col sm:flex-row gap-4 pt-4"
					>
						<Button
							size="lg"
							className="rounded-full h-14 px-10 text-lg group bg-primary text-primary-foreground hover:scale-105 transition-transform"
							asChild
						>
							<Link to="/auth/signup">
								Start Your Session
								<ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
							</Link>
						</Button>
						<Button
							variant="outline"
							size="lg"
							className="rounded-full h-14 px-10 text-lg text-foreground hover:bg-foreground hover:text-background transition-colors"
						>
							View Style Gallery
						</Button>
					</motion.div>

					{/* Trust Bar */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 1, duration: 1 }}
						className="pt-12 flex gap-12 items-center opacity-50 grayscale hover:grayscale-0 transition-all duration-700"
					>
                        <span className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">As seen on</span>
						<div className="flex gap-8 items-center text-sm font-display font-bold">
                            <span>Vogue</span>
                            <span>GQ</span>
                            <span>Forbes</span>
                        </div>
					</motion.div>
				</div>

				{/* Visual Showcase */}
				<motion.div
					initial={{ opacity: 0, scale: 0.9, x: 20 }}
					animate={{ opacity: 1, scale: 1, x: 0 }}
					transition={{ delay: 0.4, duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
					className="relative group flex-1 w-full max-w-lg aspect-3/4"
				>
					<div className="absolute inset-0 bg-secondary rounded-2xl overflow-hidden shadow-2xl skew-y-2 group-hover:skew-y-0 transition-transform duration-1000">
						<img
							src="/hero_headshot_preview_1773972472569.png"
							alt="Professional AI Headshot Preview"
							className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-1000"
						/>
                        {/* Dramatic Lighting Overlay */}
                        <div className="absolute inset-0 bg-linear-to-tr from-background/40 via-transparent to-white/10" />
					</div>
					
					{/* Floating Stats or Tags */}
					<motion.div 
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 1.2, duration: 1 }}
                        className="absolute -bottom-8 -right-8 glass p-6 rounded-xl space-y-1 shadow-lg border-white/20"
                    >
						<div className="text-xs uppercase tracking-[3px] text-muted-foreground font-bold">Session status</div>
						<div className="text-xl font-display italic">Polishing results...</div>
						<div className="flex gap-2 pt-2">
							<div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
							<div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse delay-75" />
							<div className="w-1.5 h-1.5 rounded-full bg-primary/20 animate-pulse delay-150" />
						</div>
					</motion.div>

                    {/* Background Accents */}
                    <div className="absolute -top-12 -left-12 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
				</motion.div>
			</div>

            {/* Experience Grid Section */}
            <section className="bg-foreground text-background py-32 px-6 overflow-hidden">
                <div className="max-w-7xl mx-auto space-y-24">
                    <div className="flex flex-col md:flex-row items-end justify-between gap-8">
                        <h2 className="text-6xl md:text-8xl leading-tight">The <br/><span className="italic">Process</span></h2>
                        <p className="max-w-xs text-muted-foreground text-sm uppercase tracking-widest leading-loose">
                            Your professional portrait, refined through the most advanced photographic neural networks available today.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-1 px-4 border-t border-background/10">
                        <ProcessStep 
                            number="01" 
                            title="The Capture" 
                            description="Upload a raw smartphone selfie. We analyze posture, lighting, and facial geometry."
                            icon={<Upload className="w-6 h-6" />}
                        />
                         <ProcessStep 
                            number="02" 
                            title="The Refine" 
                            description="Select from 50+ curated professional styles, from Silicon Valley casual to Tokyo corporate."
                            icon={<Camera className="w-6 h-6" />}
                        />
                         <ProcessStep 
                            number="03" 
                            title="The Reveal" 
                            description="Download high-resolution, print-ready headshots optimized for LinkedIn and Press."
                            icon={<Sparkles className="w-6 h-6" />}
                        />
                    </div>
                </div>
            </section>
		</main>
	);
}

function ProcessStep({ number, title, description, icon }: { number: string; title: string; description: string; icon: React.ReactNode }) {
    return (
        <div className="p-12 hover:bg-background/5 transition-colors group">
            <div className="flex justify-between items-start mb-12">
                <span className="text-sm tracking-widest font-semibold opacity-30">{number}</span>
                <div className="opacity-0 group-hover:opacity-100 bg-background p-3 rounded-full text-foreground -rotate-45 group-hover:rotate-0 transform transition-all duration-500">
                    {icon}
                </div>
            </div>
            <h3 className="text-4xl mb-6">{title}</h3>
            <p className="text-muted-foreground font-light leading-relaxed">{description}</p>
        </div>
    );
}
