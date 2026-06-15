import { GuildBan, AuditLogEvent } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { buildModEmbed, sendModLog, sendPublicModLog, fetchAuditEntry } from '../../lib/modUtils';

const event: EventFile = {
	async execute(ban: GuildBan) {
		const entry = await fetchAuditEntry(ban.guild, AuditLogEvent.MemberBanRemove, ban.user.id);
		if (!entry?.executor) return;

		const [target, moderator] = await Promise.all([
			ban.guild.client.users.fetch(ban.user.id).catch(() => null),
			ban.guild.client.users.fetch(entry.executor.id).catch(() => null),
		]);
		if (!target || !moderator) return;

		const embed = buildModEmbed({
			action: 'Member Unbanned',
			target,
			moderator,
			reason: entry.reason ?? 'No reason provided',
			color: 0x77dd77,
		});

		await Promise.all([sendModLog(ban.guild, embed), sendPublicModLog(ban.guild, embed)]);
	},
};

export default event;
