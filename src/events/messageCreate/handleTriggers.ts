import type { Message } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { botDeletedMessages } from '../../lib/botDeletedMessages';

const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 10_000;

const event: EventFile = {
	async execute(message: Message) {
		if (message.author.bot || !message.inGuild()) return;

		const triggerName = message.content.trim().toLowerCase().split(/\s+/)[0];
		if (!triggerName) return;

		const trigger = await prisma.guildAlias.findFirst({
			where: { guildId: message.guild.id, type: 'trigger', name: triggerName },
		});

		if (!trigger) return;

		const key = `${message.guild.id}:${triggerName}`;
		const last = cooldowns.get(key) ?? 0;
		if (Date.now() - last < COOLDOWN_MS) return;
		cooldowns.set(key, Date.now());

		const mentions = [...message.mentions.users.values()];
		const prefix = mentions.length > 0 ? mentions.map((u) => `<@${u.id}>`).join(' ') + ' ' : '';

		botDeletedMessages.add(message.id);
		await message.delete().catch(() => { botDeletedMessages.delete(message.id); });
		await message.channel.send(`${prefix}\n${trigger.value.replace(/\\n/g, '\n')}`);
	},
};

export default event;
