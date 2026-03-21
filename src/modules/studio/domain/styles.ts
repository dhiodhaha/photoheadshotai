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
			"Executive portrait, premium tailored suit, dark moody background, Rembrandt lighting, commanding presence, ultra sharp",
		image: "/hero_headshot_preview_1773972472569.png",
	},
	{
		id: "corporate",
		label: "Corporate",
		description: "Clean, polished look for LinkedIn and business profiles",
		prompt:
			"Professional corporate headshot, clean navy suit, neutral background, soft studio lighting, sharp focus",
		image: "/auth_fashion_portrait_1.png",
	},
	{
		id: "creative",
		label: "Creative",
		description: "Artistic and editorial for portfolios and personal branding",
		prompt:
			"Modern creative portrait, artistic lighting, vibrant but professional, editorial style, dramatic shadows",
		image: "/auth_fashion_portrait_2.png",
	},
	{
		id: "casual",
		label: "Casual Professional",
		description: "Relaxed yet professional for startups and personal sites",
		prompt:
			"Relaxed professional portrait, smart casual attire, warm natural lighting, approachable expression, soft bokeh background",
		image: "/auth_fashion_portrait_1.png",
	},
	{
		id: "minimal",
		label: "Minimal",
		description: "Clean and simple with white or light background",
		prompt:
			"Minimalist headshot, clean white background, simple elegant attire, even flat lighting, modern and crisp",
		image: "/auth_fashion_portrait_2.png",
	},
];

export function getStyleById(id: string): HeadshotStyle | undefined {
	return HEADSHOT_STYLES.find((s) => s.id === id);
}

export function buildPrompt(stylePrompt: string): string {
	return `A highly professional, cinematic, hyper-realistic upper-body portrait photography of the exact person in the reference image. The person is dressed cleanly, looking directly at the camera with a confident, slight smile. Style: ${stylePrompt}. Studio lighting, soft shadows, 8k resolution, shot on 85mm lens.`;
}
