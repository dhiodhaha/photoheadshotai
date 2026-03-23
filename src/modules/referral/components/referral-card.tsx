import { Check, Copy, Gift } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
	referralCode: string;
};

export function ReferralCard({ referralCode }: Props) {
	const [copied, setCopied] = useState(false);
	const referralUrl =
		typeof window !== "undefined"
			? `${window.location.origin}/auth/signup?code=${referralCode}`
			: `/auth/signup?code=${referralCode}`;

	const handleCopy = async () => {
		await navigator.clipboard.writeText(referralUrl);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
			<div className="flex items-center gap-2">
				<Gift className="w-4 h-4 text-primary" />
				<h3 className="text-sm font-medium">Invite Friends</h3>
			</div>

			<p className="text-xs text-muted-foreground leading-relaxed">
				Share your referral link. When a friend signs up and verifies their
				email, you earn{" "}
				<span className="text-primary font-medium">10 credits</span>.
			</p>

			<div className="flex items-center gap-2">
				<input
					readOnly
					value={referralUrl}
					onClick={(e) => e.currentTarget.select()}
					className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-muted-foreground font-mono truncate focus:outline-none focus:border-primary/50 transition-colors"
				/>
				<Button
					type="button"
					size="sm"
					variant="outline"
					onClick={handleCopy}
					className="shrink-0 border-white/10 hover:border-primary/50"
				>
					{copied ? (
						<Check className="w-3.5 h-3.5 text-green-400" />
					) : (
						<Copy className="w-3.5 h-3.5" />
					)}
				</Button>
			</div>

			<p className="text-[10px] text-muted-foreground/50">
				Your code:{" "}
				<span className="font-mono text-muted-foreground">{referralCode}</span>
			</p>
		</div>
	);
}
