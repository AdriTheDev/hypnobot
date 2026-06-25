import { GuildMember, PartialGuildMember, AuditLogEvent } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { fetchAuditEntry, buildModEmbed, sendModLog } from '../../lib/modUtils';
import ms from 'ms';

const event: EventFile = {
	async execute(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
		const wasTimedOut = oldMember.communicationDisabledUntil && oldMember.communicationDisabledUntil > new Date();
		const isNowTimedOut = newMember.communicationDisabledUntil && newMember.communicationDisabledUntil > new Date();

		if (wasTimedOut || !isNowTimedOut) return;

		const entry = await fetchAuditEntry(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id);
		if (!entry?.executor) return;
		if (entry.executor.id === newMember.guild.client.user?.id) return;

		const executor = await newMember.guild.client.users.fetch(entry.executor.id).catch(() => null);
		if (!executor) return;

		const durationMs = newMember.communicationDisabledUntil!.getTime() - Date.now();
		const durationLabel = ms(durationMs, { long: true });

		const embed = buildModEmbed({
			action: 'Member Timed Out',
			target: newMember.user,
			moderator: executor,
			reason: entry.reason ?? 'No reason provided',
			duration: durationLabel,
			color: 0xffc067,
		});

		await sendModLog(newMember.guild, embed);
	},
};

export default event;
