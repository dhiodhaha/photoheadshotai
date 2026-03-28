import { useEffect, useRef } from "react";

interface PollingCallbacks {
	onCompleted: (resultUrl: string) => void;
	onFailed: () => void;
	onTimeout: () => void;
}

const POLL_INTERVAL_MS = 3000;
const POLL_INITIAL_DELAY_MS = 10_000; // Seedream takes 20–40s min — skip first ~3 wasted polls
const MAX_POLL_COUNT = 60;

export function useGenerationPolling(callbacks: PollingCallbacks) {
	const pollInterval = useRef<ReturnType<typeof setInterval>>(null);
	const initialDelay = useRef<ReturnType<typeof setTimeout>>(null);
	const pollCount = useRef(0);
	const callbacksRef = useRef(callbacks);
	callbacksRef.current = callbacks;

	useEffect(() => {
		return () => {
			if (initialDelay.current) clearTimeout(initialDelay.current);
			if (pollInterval.current) clearInterval(pollInterval.current);
		};
	}, []);

	const stopPolling = () => {
		if (initialDelay.current) {
			clearTimeout(initialDelay.current);
			initialDelay.current = null;
		}
		if (pollInterval.current) {
			clearInterval(pollInterval.current);
			pollInterval.current = null;
		}
		pollCount.current = 0;
	};

	const startPolling = (jobId: string) => {
		stopPolling();
		initialDelay.current = setTimeout(() => {
			pollInterval.current = setInterval(async () => {
				pollCount.current++;

				if (pollCount.current > MAX_POLL_COUNT) {
					stopPolling();
					callbacksRef.current.onTimeout();
					return;
				}

				try {
					const res = await fetch(`/api/studio/status/${jobId}`);
					if (!res.ok) return;
					const data = await res.json();

					if (data.status === "completed" && data.resultUrl) {
						stopPolling();
						callbacksRef.current.onCompleted(data.resultUrl);
					} else if (data.status === "failed") {
						stopPolling();
						callbacksRef.current.onFailed();
					}
				} catch (_error: unknown) {
					// Network error — retry on next interval
				}
			}, POLL_INTERVAL_MS);
		}, POLL_INITIAL_DELAY_MS);
	};

	return { startPolling, stopPolling };
}
