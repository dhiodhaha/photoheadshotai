// Domain

export type { SignInInput, SignUpInput } from "./application/auth.schema";
// Schemas
export { signInSchema, signUpSchema } from "./application/auth.schema";

// Application
export {
	getSession,
	signIn,
	signOut,
	signUp,
} from "./application/auth.service";
export type { Session } from "./domain/session.entity";
export type { User } from "./domain/user.entity";

// Infrastructure (server-only)
export { getServerSession } from "./infrastructure/auth.server";
