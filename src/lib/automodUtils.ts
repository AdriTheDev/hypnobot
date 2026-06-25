import { GuildMember } from 'discord.js';
import { prisma } from './prisma';
import { buildModEmbed, sendModLog, sendPublicModLog } from './modUtils';

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
	if (member.user.globalName && NON_ASCII_RE.test(member.user.globalName)) total += NON_ASCII_DISPLAY_NAME_POINTS;

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

	let suspendedRole = member.guild.roles.cache.find((r) => r.name === 'Suspended');
	if (!suspendedRole) {
		suspendedRole = await member.guild.roles.create({
			name: 'Suspended',
			color: 0x808080,
			reason: 'Auto-created for suspension system',
		});
	}

	const roleIds = member.roles.cache.filter((r) => r.id !== member.guild.id).map((r) => r.id);
	const reason = `Automod: risk score ${points}/${AUTOMOD_THRESHOLD}`;

	await prisma.suspendedUser.create({
		data: {
			userId: member.id,
			guildId: member.guild.id,
			roleIds,
			moderatorId: member.client.user!.id,
			reason,
		},
	});

	await member.roles.set([suspendedRole], reason).catch(() => null);

	const embed = buildModEmbed({
		action: '[AUTO] Member Suspended',
		target: member.user,
		moderator: member.client.user!,
		reason,
		color: 0xff6961,
	});

	await Promise.all([sendModLog(member.guild, embed), sendPublicModLog(member.guild, embed)]);
}
