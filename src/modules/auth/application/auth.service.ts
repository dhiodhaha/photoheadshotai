import { authClient } from "#/lib/auth-client";
import type { SignInInput, SignUpInput } from "./auth.schema";
import { signInSchema, signUpSchema } from "./auth.schema";

export async function signUp(data: SignUpInput) {
	const parsed = signUpSchema.parse(data);
	return authClient.signUp.email(parsed);
}

export async function signIn(data: SignInInput) {
	const parsed = signInSchema.parse(data);
	return authClient.signIn.email(parsed);
}

export async function signOut() {
	return authClient.signOut();
}

export async function getSession() {
	return authClient.getSession();
}
