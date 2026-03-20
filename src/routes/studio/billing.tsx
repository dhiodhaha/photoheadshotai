import { createFileRoute } from '@tanstack/react-router';
import { CreditCard, CheckCircle2, Zap, Sparkles, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/studio/billing')({
	component: BillingPage,
});

const PLANS = [
	{
		id: 'starter',
		name: 'Starter Edition',
		credits: 50,
		price: '$9',
		description: 'Perfect for an essential professional refresh.',
		features: ['5 High-Res Generations', 'Standard Processing', 'Basic Styles Included'],
        isPopular: false,
	},
	{
		id: 'pro',
		name: 'Pro Archive',
		credits: 150,
		price: '$19',
		description: 'Our most sought-after package for deep exploration.',
		features: [
			'15 High-Res Generations',
			'Priority GPU Processing',
			'All Cinematic & Editorial Styles',
			'4K Upscaling',
		],
        isPopular: true,
	},
	{
		id: 'agency',
		name: 'Agency Elite',
		credits: 500,
		price: '$49',
		description: 'For power users needing endless variations.',
		features: [
			'50 High-Res Generations',
			'Highest Priority Queue',
			'Early Access to New Models',
			'Commercial Use License',
		],
        isPopular: false,
	},
];

function BillingPage() {
	return (
		<div className="relative min-h-[calc(100vh-5rem)] p-6 md:p-12 overflow-y-auto">
			{/* Ambient background glow */}
			<div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none opacity-50" />
			<div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[100px] pointer-events-none opacity-30" />

			<div className="max-w-6xl mx-auto relative z-10">
				<motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-16 space-y-4"
                >
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-white/10 text-[10px] font-bold tracking-widest uppercase mb-4 text-muted-foreground">
						<CreditCard className="w-3 h-3 text-primary" />
						Billing & Credits
					</div>
					<h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight leading-tight">
						Recharge your <span className="italic font-light text-muted-foreground">creativity.</span>
					</h1>
					<p className="text-muted-foreground max-w-xl mx-auto text-lg font-light tracking-wide">
						Top up your balance to continue generating studio-grade headshots. Simple, transparent pricing with no hidden subscriptions.
					</p>
				</motion.div>

				<div className="grid md:grid-cols-3 gap-8 items-center">
					{PLANS.map((plan, i) => (
						<motion.div
                            key={plan.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
							className={cn(
								'relative p-8 rounded-4xl glass border transition-all duration-500 hover:scale-105 group',
								plan.isPopular
									? 'border-primary ring-1 ring-primary/30 shadow-2xl shadow-primary/10 bg-white/5 py-12 -my-4'
									: 'border-white/10 hover:border-white/30'
							)}
						>
							{plan.isPopular && (
								<div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-linear-to-r from-primary to-accent text-primary-foreground text-[10px] font-bold uppercase tracking-widest shadow-lg flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    Most Popular
                                </div>
							)}

							<div className="space-y-6">
								<div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-display text-2xl font-bold">{plan.name}</h3>
                                        {plan.isPopular && <Zap className="w-5 h-5 text-primary" />}
                                    </div>
									<div className="flex items-baseline gap-2 mb-2">
										<span className="text-5xl font-display font-bold tracking-tighter">{plan.price}</span>
										<span className="text-muted-foreground text-sm font-semibold tracking-widest uppercase">/ one-time</span>
									</div>
									<div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-bold text-white mb-4">
										<Zap className="w-3 h-3 text-primary" />
										{plan.credits} Credits
									</div>
									<p className="text-muted-foreground text-sm font-light mt-2 line-clamp-2">
										{plan.description}
									</p>
								</div>

								<div className="w-full h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />

								<ul className="space-y-4">
									{plan.features.map((feature, idx) => (
										<li key={idx} className="flex gap-3 text-sm text-white/80 font-light">
											<CheckCircle2 className={cn("w-4 h-4 shrink-0 mt-0.5", plan.isPopular ? "text-primary" : "text-white/40")} />
											<span>{feature}</span>
										</li>
									))}
								</ul>

								<Button
                                    size="lg"
									className={cn(
										'w-full rounded-xl h-12 uppercase tracking-widest text-xs font-bold transition-all duration-300',
										plan.isPopular
											? 'bg-primary text-primary-foreground hover:brightness-110 shadow-lg shadow-primary/20'
											: 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
									)}
								>
									Purchase {plan.credits} Credits
								</Button>
							</div>
                            <div className="absolute inset-0 bg-linear-to-tr from-white/0 via-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-4xl" />
						</motion.div>
					))}
				</div>

				{/* Secure Payment Notice */}
				<motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-16 text-center text-xs text-muted-foreground font-light uppercase tracking-widest flex items-center justify-center gap-2"
                >
					<ShieldCheck className="w-4 h-4 text-white/40" />
					Secure payments powered by Stripe. All major cards accepted.
				</motion.div>
			</div>
		</div>
	);
}
