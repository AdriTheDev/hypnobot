import type { Client } from 'discord.js';
import type { EventFile } from '../../lib/types';

const event: EventFile = {
	once: true,
	execute(client: Client) {
		console.log(`[Ready] Logged in as ${client.user?.tag}`);
	},
};

export default event;
