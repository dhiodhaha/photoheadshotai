import { Resend } from "resend";
import {
	buildPasswordResetEmailHtml,
	buildVerificationEmailHtml,
} from "./email-templates";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(
	to: string,
	subject: string,
	html: string,
): Promise<void> {
	const fromEmail =
		process.env.RESEND_FROM_EMAIL ?? "Studio AI <noreply@studio.ai>";

	const { error } = await resend.emails.send({
		from: fromEmail,
		to,
		subject,
		html,
	});

	if (error) {
		console.error("Failed to send email:", error);
		throw new Error(`Email send failed: ${error.message}`);
	}
}

export async function sendVerificationEmail(
	to: string,
	name: string,
	url: string,
): Promise<void> {
	await sendEmail(
		to,
		"Verify your email — Studio AI",
		buildVerificationEmailHtml(name, url),
	);
}

export async function sendPasswordResetEmail(
	to: string,
	name: string,
	url: string,
): Promise<void> {
	await sendEmail(
		to,
		"Reset your password — Studio AI",
		buildPasswordResetEmailHtml(name, url),
	);
}
