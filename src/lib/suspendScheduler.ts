import { Client, EmbedBuilder } from 'discord.js';
import { prisma } from './prisma';
import { sendModLog, sendPublicModLog } from './modUtils';
import { applyMcModAction } from './mcRcon';

export interface SuspendedUserRecord {
	userId: string;
	guildId: string;
	roleIds: string[];
	reason: string;
	expiresAt: Date;
}

async function expireSuspension(client: Client, record: SuspendedUserRecord): Promise<void> {
	const suspension = await prisma.suspendedUser
		.findUnique({
			where: { userId_guildId: { userId: record.userId, guildId: record.guildId } },
		})
		.catch(() => null);

	if (!suspension) return;

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

export function scheduleSuspension(client: Client, record: SuspendedUserRecord): void {
	const delay = Math.max(0, record.expiresAt.getTime() - Date.now());
	setTimeout(() => expireSuspension(client, record), delay);
}

export async function initSuspendScheduler(client: Client): Promise<void> {
	const suspensions = await prisma.suspendedUser.findMany({ where: { expiresAt: { not: null } } });
	const now = new Date();

	const typed = suspensions as ((typeof suspensions)[number] & { expiresAt: Date })[];
	const expired = typed.filter((s) => s.expiresAt <= now);
	const pending = typed.filter((s) => s.expiresAt > now);

	await Promise.all(expired.map((s) => expireSuspension(client, s)));
	for (const s of pending) scheduleSuspension(client, s);
}
