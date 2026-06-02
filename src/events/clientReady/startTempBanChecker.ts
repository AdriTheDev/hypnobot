import type { Client } from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { sendModLog, sendPublicModLog } from '../../lib/modUtils';

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

					const user = await client.users.fetch(ban.userId).catch(() => null);
					if (user) {
						const embed = new EmbedBuilder()
							.setTitle('[AUTO] Temporary Ban Expired')
							.setColor(0x77dd77)
							.addFields(
								{ name: 'User', value: `${user} (\`${user.id}\`)`, inline: true },
								{ name: 'Reason', value: ban.reason },
							)
							.setTimestamp();
						await Promise.all([sendModLog(guild, embed), sendPublicModLog(guild, embed)]);
					}
				} catch {
					/* guild or ban may no longer exist */
				}
				await prisma.tempBan.delete({ where: { id: ban.id } }).catch(() => null);
			}
		}, 60_000);
	},
};

export default event;
