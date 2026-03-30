import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "#/lib/auth-client";

const CREDITS_QUERY_KEY = ["credits"] as const;

async function fetchCredits(): Promise<number> {
	const res = await fetch("/api/user/profile");
	if (!res.ok) throw new Error("Failed to fetch credits");
	const data = await res.json();
	return data.user.currentCredits as number;
}

export function useCredits() {
	const session = authClient.useSession();
	const sessionCredits = session.data?.user?.currentCredits;

	const { data: credits = 0 } = useQuery({
		queryKey: CREDITS_QUERY_KEY,
		queryFn: fetchCredits,
		initialData: sessionCredits,
		staleTime: 0,
	});

	return credits;
}

export function useCreditsActions() {
	const queryClient = useQueryClient();

	return {
		deduct: (amount: number) => {
			queryClient.setQueryData<number>(CREDITS_QUERY_KEY, (old = 0) =>
				Math.max(0, old - amount),
			);
		},
		set: (balance: number) => {
			queryClient.setQueryData<number>(CREDITS_QUERY_KEY, balance);
		},
		invalidate: () => {
			queryClient.invalidateQueries({ queryKey: CREDITS_QUERY_KEY });
		},
	};
}
