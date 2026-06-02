import { GuildMember, PartialGuildMember, AuditLogEvent } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { buildModEmbed, sendModLog, sendPublicModLog } from '../../lib/modUtils';

const event: EventFile = {
	async execute(member: GuildMember | PartialGuildMember) {
		if (!member.user) return;

		const logs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 1 }).catch(() => null);
		const entry = logs?.entries.first();

		if (!entry?.executor || entry.target?.id !== member.id) return;
		if (Date.now() - entry.createdTimestamp > 5000) return;
		if (entry.executor.id === member.guild.client.user?.id) return;

		const [target, moderator] = await Promise.all([
			member.guild.client.users.fetch(member.id).catch(() => null),
			member.guild.client.users.fetch(entry.executor.id).catch(() => null),
		]);
		if (!target || !moderator) return;

		const embed = buildModEmbed({
			action: 'Member Kicked',
			target,
			moderator,
			reason: entry.reason ?? 'No reason provided',
			color: 0xff6961,
		});

		await Promise.all([sendModLog(member.guild, embed), sendPublicModLog(member.guild, embed)]);
	},
};

export default event;
