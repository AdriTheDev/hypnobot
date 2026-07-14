import type { Message } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { countMeowWords } from '../../lib/meow';

const event: EventFile = {
	async execute(message: Message) {
		if (message.author.bot || !message.inGuild()) return;

		const counts = countMeowWords(message.content);
		const entries = Object.entries(counts) as [string, number][];
		if (entries.length === 0) return;

		const userId = message.author.id;
		const guildId = message.guild.id;

		await Promise.all(
			entries.map(([word, count]) =>
				prisma.meowCount.upsert({
					where: { guildId_userId_word: { guildId, userId, word } },
					create: { guildId, userId, word, count },
					update: { count: { increment: count } },
				}),
			),
		);
	},
};

export default event;
