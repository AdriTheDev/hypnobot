import type { Client } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';

const event: EventFile = {
	once: true,
	async execute(client: Client) {
		setInterval(async () => {
			const expired = await prisma.tempBan.findMany({
				where: { expiresAt: { lte: new Date() } },
			});

			for (const ban of expired) {
				try {
					const guild = await client.guilds.fetch(ban.guildId);
					await guild.bans.remove(ban.userId, 'Temporary ban expired.');
				} catch {
					/* guild or ban may no longer exist */
				}
				await prisma.tempBan.delete({ where: { id: ban.id } }).catch(() => null);
			}
		}, 60_000);
	},
};

export default event;
