import { GuildBan, AuditLogEvent } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { buildModEmbed, sendModLog, sendPublicModLog } from '../../lib/modUtils';

const event: EventFile = {
	async execute(ban: GuildBan) {
		const logs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 }).catch(() => null);
		const entry = logs?.entries.first();

		if (!entry?.executor || entry.target?.id !== ban.user.id) return;
		if (entry.executor.id === ban.guild.client.user?.id) return;

		const [target, moderator] = await Promise.all([
			ban.guild.client.users.fetch(ban.user.id).catch(() => null),
			ban.guild.client.users.fetch(entry.executor.id).catch(() => null),
		]);
		if (!target || !moderator) return;

		const embed = buildModEmbed({
			action: 'Member Banned',
			target,
			moderator,
			reason: entry.reason ?? 'No reason provided',
			color: 0xff6961,
		});

		await Promise.all([sendModLog(ban.guild, embed), sendPublicModLog(ban.guild, embed)]);
	},
};

export default event;
