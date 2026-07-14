const TTL_MS = 10_000;

function createTTLSet() {
	const store = new Map<string, ReturnType<typeof setTimeout>>();
	return {
		add(id: string): void {
			const existing = store.get(id);
			if (existing) clearTimeout(existing);
			store.set(
				id,
				setTimeout(() => store.delete(id), TTL_MS),
			);
		},
		has(id: string): boolean {
			return store.has(id);
		},
		delete(id: string): boolean {
			const timer = store.get(id);
			if (!timer) return false;
			clearTimeout(timer);
			store.delete(id);
			return true;
		},
	};
}

export const botDeletedMessages = createTTLSet();
export const botDeletedChannels = createTTLSet();
