import { GuildChannel } from 'discord.js';
import type { EventFile, ExtendedClient } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { botDeletedChannels } from '../../lib/botDeletedTracking';

const event: EventFile = {
	once: true,
	async execute(client: ExtendedClient) {
		const records = await prisma.joinToCreateVC.findMany();
		for (const vc of records) {
			try {
				const channel = await client.channels.fetch(vc.channelId).catch(() => null);
				if (channel instanceof GuildChannel) {
					botDeletedChannels.add(channel.id);
					await channel.delete().catch(() => botDeletedChannels.delete(channel.id));
				}
			} catch {
				// channel may already be gone
			}
			await prisma.joinToCreateVC.delete({ where: { channelId: vc.channelId } }).catch(() => null);
		}
	},
};

export default event;
