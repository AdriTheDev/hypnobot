import { Guild, EmbedBuilder, TextChannel } from 'discord.js';
import { prisma } from './prisma';

export function botBaitFooterText(count: number): string {
	return `So far I've baited ${count} bot${count === 1 ? '' : 's'}.`;
}

export async function recordBotBaitBan(guild: Guild, channelId: string, messageId: string): Promise<void> {
	const updated = await prisma.guildConfig.update({
		where: { guildId: guild.id },
		data: { botBaitBanCount: { increment: 1 } },
	});

	const channel = guild.channels.cache.get(channelId);
	if (!channel?.isTextBased()) return;

	const message = await (channel as TextChannel).messages.fetch(messageId).catch(() => null);
	if (!message) return;

	const embed = message.embeds[0] ? EmbedBuilder.from(message.embeds[0]) : new EmbedBuilder();
	embed.setFooter({ text: botBaitFooterText(updated.botBaitBanCount) });

	await message.edit({ embeds: [embed] }).catch(() => null);
}
