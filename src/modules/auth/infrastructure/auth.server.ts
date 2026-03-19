import { auth } from "#/lib/auth";
import type { Session } from "../domain/session.entity";
import type { User } from "../domain/user.entity";

export async function getServerSession(
	request: Request,
): Promise<{ user: User; session: Session } | null> {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) return null;
	return session as { user: User; session: Session };
}
