import type { Message } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';

const event: EventFile = {
	async execute(message: Message) {
		if (message.author.bot || !message.inGuild()) return;

		const triggerName = message.content.trim().toLowerCase().split(/\s+/)[0];
		if (!triggerName) return;

		const trigger = await prisma.guildAlias.findFirst({
			where: { guildId: message.guild.id, type: 'trigger', name: triggerName },
		});

		if (!trigger) return;

		const mentions = [...message.mentions.users.values()];
		const prefix = mentions.length > 0 ? mentions.map((u) => `<@${u.id}>`).join(' ') + ' ' : '';

		await message.delete().catch(() => null);
		await message.channel.send(`${prefix}\n${trigger.value}`);
	},
};

export default event;
