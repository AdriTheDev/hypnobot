import { Collection, Snowflake, Message, PartialMessage, GuildTextBasedChannel, EmbedBuilder, AuditLogEvent } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { sendLog } from '../../lib/logWebhook';

const event: EventFile = {
	async execute(messages: Collection<Snowflake, Message | PartialMessage>, channel: GuildTextBasedChannel) {
		const config = await prisma.guildConfig.findUnique({ where: { guildId: channel.guild.id } });
		if (!config?.messageLogChannel) return;

		await new Promise((r) => setTimeout(r, 1000));

		const logs = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.MessageBulkDelete, limit: 3 }).catch(() => null);
		const entry = logs?.entries.find((e) => {
			if (!e.target || !('id' in (e.target as object)) || (e.target as { id: string }).id !== channel.id) return false;
			return Date.now() - e.createdTimestamp < 7000;
		});

		if (entry?.executor?.id === channel.guild.client.user?.id) return;

		// Ban-triggered deletions don't produce a MessageBulkDelete audit entry — only MemberBanAdd.
		// If there's no bulk-delete entry but a ban happened in the last 15s, this is ban cleanup.
		if (!entry) {
			const banLogs = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 5 }).catch(() => null);
			const recentBan = banLogs?.entries.find((e) => Date.now() - e.createdTimestamp < 15000);
			if (recentBan) return;
		}

		const deletedBy = entry?.executor ?? null;

		const embed = new EmbedBuilder()
			.setTitle('Messages Bulk Deleted')
			.setColor(0xff6961)
			.addFields(
				{ name: 'Channel', value: `<#${channel.id}>`, inline: true },
				{ name: 'Count', value: `${messages.size} messages`, inline: true },
			)
			.setFooter({ text: `Channel ID: ${channel.id}` })
			.setTimestamp();

		if (deletedBy) {
			embed.addFields({ name: 'Deleted By', value: `${deletedBy} (\`${deletedBy.id}\`)`, inline: true });
		}

		await sendLog(channel.guild, config.messageLogChannel, embed);
	},
};

export default event;
