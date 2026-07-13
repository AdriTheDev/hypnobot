import { EmbedBuilder, Guild, User } from 'discord.js';
import { prisma } from './prisma';
import { MEOW_WORDS } from './meowUtils';

const MEDALS = ['🥇', '🥈', '🥉'];
const COLOR = 0xfd86f3;

function emptyEmbed(guild: Guild, footer: string): EmbedBuilder {
	return new EmbedBuilder()
		.setTitle(`Meow Meter:tm:`)
		.setDescription('No one has said any meow words in this server yet!')
		.setColor(COLOR)
		.setTimestamp()
		.setFooter({ text: footer });
}

export async function buildMeowWordsEmbed(guild: Guild): Promise<EmbedBuilder> {
	const grouped = await prisma.meowCount.groupBy({
		by: ['word'],
		where: { guildId: guild.id },
		_sum: { count: true },
		orderBy: { _sum: { count: 'desc' } },
		take: 10,
	});

	if (grouped.length === 0) return emptyEmbed(guild, 'Top 10 words/variations');

	const lines = grouped.map((g, i) => {
		const medal = MEDALS[i] ?? `**${i + 1}.**`;
		return `${medal} \`${g.word}\` - ${(g._sum.count ?? 0).toLocaleString()} uses`;
	});

	return new EmbedBuilder()
		.setTitle(`Meow Meter:tm:`)
		.setDescription(lines.join('\n'))
		.setColor(COLOR)
		.setTimestamp()
		.setFooter({ text: 'Top 10 words/variations' });
}

export async function buildMeowUsersEmbed(guild: Guild): Promise<EmbedBuilder> {
	const grouped = await prisma.meowCount.groupBy({
		by: ['userId'],
		where: { guildId: guild.id },
		_sum: { count: true },
		orderBy: { _sum: { count: 'desc' } },
		take: 10,
	});

	if (grouped.length === 0) return emptyEmbed(guild, 'Top 10 users');

	const lines = await Promise.all(
		grouped.map(async (g, i) => {
			const user = await guild.client.users.fetch(g.userId).catch(() => null);
			const name = user ? `${user}` : g.userId;
			const medal = MEDALS[i] ?? `**${i + 1}.**`;
			return `${medal} ${name} - ${(g._sum.count ?? 0).toLocaleString()} total`;
		}),
	);

	return new EmbedBuilder()
		.setTitle(`Meow Meter:tm:`)
		.setDescription(lines.join('\n'))
		.setColor(COLOR)
		.setTimestamp()
		.setFooter({ text: 'Top 10 users' });
}

export async function buildMeowUserEmbed(guild: Guild, user: User): Promise<EmbedBuilder> {
	const records = await prisma.meowCount.findMany({
		where: { guildId: guild.id, userId: user.id },
	});

	const countByWord = new Map(records.map((r) => [r.word, r.count]));
	const total = records.reduce((sum, r) => sum + r.count, 0);

	const lines = MEOW_WORDS.map((word) => `\`${word}\` - ${(countByWord.get(word) ?? 0).toLocaleString()}`);

	return new EmbedBuilder()
		.setTitle(`Meow Meter:tm:`)
		.setThumbnail(user.displayAvatarURL())
		.setDescription(lines.join('\n'))
		.setColor(COLOR)
		.setTimestamp()
		.setFooter({ text: `Total: ${total.toLocaleString()}` });
}
