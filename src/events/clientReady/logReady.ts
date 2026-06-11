import type { Client } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { logStatus } from '../../lib/statusWebhook';

const event: EventFile = {
	once: true,
	async execute(client: Client) {
		console.log(`[Ready] Logged in as ${client.user?.tag}`);
		await logStatus(
			'Bot Started',
			`Logged in as **${client.user?.tag}** — ${client.guilds.cache.size} guild(s), ${client.users.cache.size} cached user(s).`,
			0x77dd77,
		);
	},
};

export default event;
