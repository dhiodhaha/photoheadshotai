export interface HeadshotStyle {
	id: string;
	label: string;
	description: string;
	prompt: string;
	image: string;
}

export const HEADSHOT_STYLES: HeadshotStyle[] = [
	{
		id: "executive",
		label: "Executive Classic",
		description: "Authoritative and refined for C-suite and leadership pages",
		prompt:
			"Transform the person in Figure 1 into an executive portrait. Dress them in a premium tailored dark suit with a subtle tie. Place them against a dark moody studio background with Rembrandt lighting. Keep their face, features, and identity exactly the same. Ultra sharp, 8k quality.",
		image: "/hero_headshot_preview_1773972472569.png",
	},
	{
		id: "corporate",
		label: "Corporate",
		description: "Clean, polished look for LinkedIn and business profiles",
		prompt:
			"Transform the person in Figure 1 into a professional corporate headshot. Dress them in a clean navy business suit. Place them against a neutral gray studio background with soft even lighting. Keep their face, features, and identity exactly the same. Sharp focus, professional quality.",
		image: "/auth_fashion_portrait_1.png",
	},
	{
		id: "creative",
		label: "Creative",
		description: "Artistic and editorial for portfolios and personal branding",
		prompt:
			"Transform the person in Figure 1 into a modern creative portrait. Use artistic dramatic lighting with vibrant but professional tones. Add editorial-style dramatic shadows and a colorful gradient background. Keep their face, features, and identity exactly the same. High fashion editorial quality.",
		image: "/auth_fashion_portrait_2.png",
	},
	{
		id: "casual",
		label: "Casual Professional",
		description: "Relaxed yet professional for startups and personal sites",
		prompt:
			"Transform the person in Figure 1 into a casual professional portrait. Dress them in smart casual attire like a crisp button-up shirt. Use warm natural lighting with a soft bokeh outdoor background. Keep their face, features, and identity exactly the same. Approachable and friendly expression.",
		image: "/auth_fashion_portrait_1.png",
	},
	{
		id: "minimal",
		label: "Minimal",
		description: "Clean and simple with white or light background",
		prompt:
			"Transform the person in Figure 1 into a minimalist headshot. Dress them in simple elegant attire. Place them against a clean pure white background with even flat lighting. Keep their face, features, and identity exactly the same. Modern, crisp, and clean aesthetic.",
		image: "/auth_fashion_portrait_2.png",
	},
];

export function getStyleById(id: string): HeadshotStyle | undefined {
	return HEADSHOT_STYLES.find((s) => s.id === id);
}

export function buildPrompt(stylePrompt: string): string {
	return stylePrompt;
}
