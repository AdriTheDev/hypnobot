import type { Client } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { version } from '../../../package.json';

const event: EventFile = {
	once: true,
	execute(client: Client) {
		client.user?.setPresence({
			activities: [{ name: `Watching over ${client.users.cache.size} members | v${version}` }],
			status: 'online',
		});
	},
};

export default event;
