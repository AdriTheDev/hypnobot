import { GuildChannel, DMChannel, EmbedBuilder, ChannelType, AuditLogEvent } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { sendLog } from '../../lib/logWebhook';
import { fetchAuditExecutor } from '../../lib/modUtils';
import { botDeletedChannels } from '../../lib/botDeletedChannels';

const CHANNEL_TYPE_NAMES: Partial<Record<ChannelType, string>> = {
	[ChannelType.GuildText]: 'Text',
	[ChannelType.GuildVoice]: 'Voice',
	[ChannelType.GuildCategory]: 'Category',
	[ChannelType.GuildAnnouncement]: 'Announcement',
	[ChannelType.GuildForum]: 'Forum',
	[ChannelType.GuildStageVoice]: 'Stage',
	[ChannelType.GuildMedia]: 'Media',
};

const event: EventFile = {
	async execute(channel: GuildChannel | DMChannel) {
		if (!('guild' in channel)) return;
		if (botDeletedChannels.has(channel.id)) return;

		const config = await prisma.guildConfig.findUnique({ where: { guildId: channel.guild.id } });
		if (!config?.serverLogChannel) return;

		const executor = await fetchAuditExecutor(channel.guild, AuditLogEvent.ChannelDelete, channel.id);

		const embed = new EmbedBuilder()
			.setTitle('Channel Deleted')
			.setColor(0xff6961)
			.addFields(
				{ name: 'Name', value: channel.name, inline: true },
				{ name: 'Type', value: CHANNEL_TYPE_NAMES[channel.type] ?? 'Unknown', inline: true },
				{ name: 'ID', value: `\`${channel.id}\``, inline: true },
			)
			.setTimestamp();

		if (channel.parent) {
			embed.addFields({ name: 'Category', value: channel.parent.name, inline: true });
		}

		if (executor) {
			embed.addFields({ name: 'By', value: `${executor} (\`${executor.id}\`)`, inline: true });
		}

		await sendLog(channel.guild, config.serverLogChannel, embed);
	},
};

export default event;
