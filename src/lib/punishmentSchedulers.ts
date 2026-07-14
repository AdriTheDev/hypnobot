import { Client, EmbedBuilder } from 'discord.js';
import { prisma } from './prisma';
import { sendModLog, sendPublicModLog } from './modUtils';
import { applyMcModAction } from './mcRcon';

const POLL_INTERVAL_MS = 60_000;

interface SuspendedUserRecord {
	userId: string;
	guildId: string;
	roleIds: string[];
	reason: string;
}

async function expireSuspension(client: Client, record: SuspendedUserRecord): Promise<void> {
	try {
		const guild = await client.guilds.fetch(record.guildId);
		const member = await guild.members.fetch(record.userId).catch(() => null);

		if (member && member.manageable) {
			const roleIds = record.roleIds.filter((id) => guild.roles.cache.has(id));
			await member.roles.set(roleIds, 'Temporary suspension expired.');
			await applyMcModAction(record.guildId, record.userId, 'unsuspend', 'Temporary suspension expired.').catch(() => null);
		}

		const user = await client.users.fetch(record.userId).catch(() => null);
		if (user) {
			const embed = new EmbedBuilder()
				.setTitle('[AUTO] Suspension Expired')
				.setColor(0x77dd77)
				.addFields({ name: 'User', value: `${user} (\`${user.id}\`)`, inline: true }, { name: 'Reason', value: record.reason })
				.setTimestamp();
			await Promise.all([sendModLog(guild, embed), sendPublicModLog(guild, embed)]);
		}
	} catch {
		/* guild or member may no longer exist */
	}

	await prisma.suspendedUser
		.delete({
			where: { userId_guildId: { userId: record.userId, guildId: record.guildId } },
		})
		.catch(() => null);
}

interface TempBanRecord {
	id: string;
	userId: string;
	guildId: string;
	reason: string;
}

async function expireBan(client: Client, ban: TempBanRecord): Promise<void> {
	try {
		const guild = await client.guilds.fetch(ban.guildId);
		await guild.bans.remove(ban.userId, 'Temporary ban expired.');
		await applyMcModAction(ban.guildId, ban.userId, 'unban', 'Temporary ban expired.').catch(() => null);

		const user = await client.users.fetch(ban.userId).catch(() => null);
		if (user) {
			const embed = new EmbedBuilder()
				.setTitle('[AUTO] Temporary Ban Expired')
				.setColor(0x77dd77)
				.addFields({ name: 'User', value: `${user} (\`${user.id}\`)`, inline: true }, { name: 'Reason', value: ban.reason })
				.setTimestamp();
			await Promise.all([sendModLog(guild, embed), sendPublicModLog(guild, embed)]);
		}
	} catch {
		/* guild or ban may no longer exist */
	}
	await prisma.tempBan.delete({ where: { id: ban.id } }).catch(() => null);
}

async function pollExpiredPunishments(client: Client): Promise<void> {
	const now = new Date();

	const [suspensions, bans] = await Promise.all([
		prisma.suspendedUser.findMany({ where: { expiresAt: { lte: now } } }),
		prisma.tempBan.findMany({ where: { expiresAt: { lte: now } } }),
	]);

	await Promise.all([...suspensions.map((s) => expireSuspension(client, s)), ...bans.map((b) => expireBan(client, b))]);
}

export function startPunishmentExpiryPoller(client: Client): void {
	pollExpiredPunishments(client).catch((err) => console.error('[punishmentSchedulers] Poll failed:', err));
	setInterval(() => {
		pollExpiredPunishments(client).catch((err) => console.error('[punishmentSchedulers] Poll failed:', err));
	}, POLL_INTERVAL_MS);
}
