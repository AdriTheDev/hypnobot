import { EmbedBuilder, Guild, ChannelType, TextChannel } from 'discord.js';
import { prisma } from './prisma';
import { resolveLevel } from './levelingUtils';

const MEDALS = ['🥇', '🥈', '🥉'];

const pendingUpdates = new Map<string, ReturnType<typeof setTimeout>>();

export async function buildLeaderboardEmbed(guild: Guild): Promise<EmbedBuilder> {
	const top = await prisma.userLevel.findMany({
		where: { guildId: guild.id },
		orderBy: { xp: 'desc' },
		take: 10,
	});

	if (top.length === 0) {
		return new EmbedBuilder()
			.setTitle(`🏆 ${guild.name} Leaderboard`)
			.setDescription('No one has earned any XP in this server yet!')
			.setColor(0xfd86f3)
			.setTimestamp()
			.setFooter({ text: 'Top 10 members by total XP (Updates every 10 seconds)' });
	}

	const lines = await Promise.all(
		top.map(async (m, i) => {
			const user = await guild.client.users.fetch(m.userId).catch(() => null);
			const name = user ? `${user}` : m.userId;
			const medal = MEDALS[i] ?? `**${i + 1}.**`;
			const { level, currentLevelXP, requiredXP } = resolveLevel(Number(m.xp));
			return `${medal} ${name} - Level ${level} (${currentLevelXP.toLocaleString()}/${requiredXP.toLocaleString()} XP)`;
		}),
	);

	return new EmbedBuilder()
		.setTitle(`🏆 ${guild.name} Leaderboard`)
		.setDescription(lines.join('\n'))
		.setColor(0xfd86f3)
		.setTimestamp()
		.setFooter({ text: 'Top 10 members by total XP (Updates every 10 seconds)' });
}

export async function updateLeaderboard(guild: Guild): Promise<void> {
	const config = await prisma.guildConfig.findUnique({ where: { guildId: guild.id } });
	if (!config?.leaderboardChannel) return;

	const channel = guild.channels.cache.get(config.leaderboardChannel);
	if (!channel || channel.type !== ChannelType.GuildText) return;

	const textChannel = channel as TextChannel;
	const embed = await buildLeaderboardEmbed(guild);

	if (config.leaderboardMessageId) {
		const existing = await textChannel.messages.fetch(config.leaderboardMessageId).catch(() => null);
		if (existing) {
			await existing.edit({ embeds: [embed] }).catch(() => null);
			return;
		}
	}

	const posted = await textChannel.send({ embeds: [embed] }).catch(() => null);
	if (!posted) return;

	await prisma.guildConfig.update({
		where: { guildId: guild.id },
		data: { leaderboardMessageId: posted.id },
	});
}

export function scheduleLeaderboardUpdate(guild: Guild): void {
	const existing = pendingUpdates.get(guild.id);
	if (existing) clearTimeout(existing);

	const timeout = setTimeout(() => {
		pendingUpdates.delete(guild.id);
		updateLeaderboard(guild).catch(() => null);
	}, 10_000);

	pendingUpdates.set(guild.id, timeout);
}
