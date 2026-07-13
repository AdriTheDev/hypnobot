import { GuildMember } from 'discord.js';
import { prisma } from './prisma';
import { applyPunishment, DEFAULT_SUSPENSION_DURATION_MS } from './moderationActions';

export const AUTOMOD_THRESHOLD = 5;
export const DEFAULT_AVATAR_POINTS = 1;
export const NEW_ACCOUNT_DAYS = 7;
export const NEW_ACCOUNT_POINTS = 1;
export const SUSPICIOUS_USERNAME_POINTS = 1;
export const NON_ASCII_DISPLAY_NAME_POINTS = 1;

const SUSPICIOUS_USERNAME_RE = /^[a-z]+[._][a-z]+[._]\d{4,}$/i;
const NON_ASCII_RE = /[^\x00-\x7F]/;

export async function calculateRiskPoints(member: GuildMember): Promise<number> {
	const roleFactors = await prisma.automodFactor.findMany({ where: { guildId: member.guild.id } });

	let total = 0;

	if (member.user.avatar === null) total += DEFAULT_AVATAR_POINTS;
	if (Date.now() - member.user.createdTimestamp < NEW_ACCOUNT_DAYS * 86_400_000) total += NEW_ACCOUNT_POINTS;
	if (SUSPICIOUS_USERNAME_RE.test(member.user.username)) total += SUSPICIOUS_USERNAME_POINTS;
	if (NON_ASCII_RE.test(member.displayName)) total += NON_ASCII_DISPLAY_NAME_POINTS;

	for (const factor of roleFactors) {
		if (member.roles.cache.has(factor.value)) total += factor.points;
	}

	return total;
}

export async function runAutomodCheck(member: GuildMember): Promise<void> {
	const points = await calculateRiskPoints(member);
	if (points < AUTOMOD_THRESHOLD) return;

	const existing = await prisma.suspendedUser.findUnique({
		where: { userId_guildId: { userId: member.id, guildId: member.guild.id } },
	});
	if (existing) return;

	const reason = `Automod: risk score ${points}/${AUTOMOD_THRESHOLD}`;

	try {
		const result = await applyPunishment({
			action: 'suspend',
			guild: member.guild,
			targetUser: member.user,
			targetMember: member,
			moderator: { user: member.client.user!, member: null },
			reason,
			durationMs: DEFAULT_SUSPENSION_DURATION_MS,
			titlePrefix: '[AUTO] ',
		});

		if (!result.ok) {
			console.error(`[automod] Failed to suspend ${member.id} in ${member.guild.id}: ${result.failureMessage}`);
		}
	} catch (err) {
		console.error(`[automod] Unexpected error suspending ${member.id} in ${member.guild.id}:`, err);
	}
}
