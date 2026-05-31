import { Client } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { setGuildInvites } from '../../lib/inviteCache';

const event: EventFile = {
	once: true,
	async execute(client: Client) {
		for (const guild of client.guilds.cache.values()) {
			const invites = await guild.invites.fetch().catch(() => null);
			if (invites) setGuildInvites(guild.id, invites);
		}
	},
};

export default event;
