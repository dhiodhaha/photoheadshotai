// Domain
export type { Session } from "./domain/session.entity";
export type { User } from "./domain/user.entity";

// Schemas
export type { SignInInput, SignUpInput } from "./application/auth.schema";
export { signInSchema, signUpSchema } from "./application/auth.schema";

// Application
export {
	getSession,
	signIn,
	signOut,
	signUp,
} from "./application/auth.service";

// Infrastructure (server-only)
export { getServerSession } from "./infrastructure/auth.server";

// Components
export { AuthLeftPanel } from "./components/auth-left-panel";
export { SignInForm } from "./components/sign-in-form";
export { SignUpForm } from "./components/sign-up-form";
