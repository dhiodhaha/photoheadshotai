export interface HeadshotStyle {
	id: string;
	label: string;
	description: string;
	prompt: string;
	image: string;
	disabled?: boolean;
}

export const HEADSHOT_STYLES: HeadshotStyle[] = [
	{
		id: "executive",
		label: "Executive Classic",
		description: "Authoritative and refined for C-suite and leadership pages",
		prompt:
			"Transform the person in Figure 1 into an executive portrait. Dress them in a premium tailored dark suit with a subtle tie. Place them against a dark moody studio background with Rembrandt lighting. Keep their face, features, and identity exactly the same. Ultra sharp, 8k quality.",
		image:
			"https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80",
	},
	{
		id: "corporate",
		label: "Corporate",
		description: "Clean, polished look for LinkedIn and business profiles",
		prompt:
			"Transform the person in Figure 1 into a professional corporate headshot. Dress them in a clean navy business suit. Place them against a neutral gray studio background with soft even lighting. Keep their face, features, and identity exactly the same. Sharp focus, professional quality.",
		image:
			"https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80",
	},
	{
		id: "creative",
		label: "Creative",
		description: "Artistic and editorial for portfolios and personal branding",
		prompt:
			"Transform the person in Figure 1 into a modern creative portrait. Use artistic dramatic lighting with vibrant but professional tones. Add editorial-style dramatic shadows and a colorful gradient background. Keep their face, features, and identity exactly the same. High fashion editorial quality.",
		image:
			"https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&q=80",
		disabled: true,
	},
	{
		id: "casual",
		label: "Casual Professional",
		description: "Relaxed yet professional for startups and personal sites",
		prompt:
			"Transform the person in Figure 1 into a casual professional portrait. Dress them in smart casual attire like a crisp button-up shirt. Use warm natural lighting with a soft bokeh outdoor background. Keep their face, features, and identity exactly the same. Approachable and friendly expression.",
		image:
			"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
	},
	{
		id: "minimal",
		label: "Minimal",
		description: "Clean and simple with white or light background",
		prompt:
			"Transform the person in Figure 1 into a minimalist headshot. Dress them in simple elegant attire. Place them against a clean pure white background with even flat lighting. Keep their face, features, and identity exactly the same. Modern, crisp, and clean aesthetic.",
		image:
			"https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&q=80",
		disabled: true,
	},
];

export function getStyleById(id: string): HeadshotStyle | undefined {
	return HEADSHOT_STYLES.find((s) => s.id === id);
}

export function buildPrompt(stylePrompt: string): string {
	return stylePrompt;
}
