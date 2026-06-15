import type { Client } from 'discord.js';
import { version } from '../../package.json';

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function updatePresence(client: Client): void {
	if (debounceTimer) clearTimeout(debounceTimer);
	debounceTimer = setTimeout(() => {
		debounceTimer = null;
		const memberCount = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
		client.user?.setPresence({
			activities: [{ name: `Watching over ${memberCount} members | v${version}` }],
			status: 'online',
		});
	}, 2000);
}
