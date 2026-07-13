import { Client, EmbedBuilder } from 'discord.js';
import { prisma } from './prisma';
import { sendModLog, sendPublicModLog } from './modUtils';
import { applyMcModAction } from './mcRcon';

export interface TempBanRecord {
	id: string;
	userId: string;
	guildId: string;
	reason: string;
	expiresAt: Date;
}

async function expireBan(client: Client, ban: TempBanRecord): Promise<void> {
	const existing = await prisma.tempBan.findUnique({ where: { id: ban.id } }).catch(() => null);
	if (!existing) return;

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

const MAX_TIMEOUT_DELAY = 2147483647;

export function scheduleTempBan(client: Client, ban: TempBanRecord): void {
	const delay = Math.max(0, ban.expiresAt.getTime() - Date.now());
	if (delay > MAX_TIMEOUT_DELAY) {
		setTimeout(() => scheduleTempBan(client, ban), MAX_TIMEOUT_DELAY);
		return;
	}
	setTimeout(() => expireBan(client, ban), delay);
}

export async function initTempBanScheduler(client: Client): Promise<void> {
	const bans = await prisma.tempBan.findMany();
	const now = new Date();

	const expired = bans.filter((b) => b.expiresAt <= now);
	const pending = bans.filter((b) => b.expiresAt > now);

	await Promise.all(expired.map((b) => expireBan(client, b)));
	for (const ban of pending) scheduleTempBan(client, ban);
}
