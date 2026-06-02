import type { Client } from 'discord.js';
import { version } from '../../package.json';

export function updatePresence(client: Client): void {
	const memberCount = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
	client.user?.setPresence({
		activities: [{ name: `Watching over ${memberCount} members | v${version}` }],
		status: 'online',
	});
}
