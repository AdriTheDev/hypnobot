import { GuildMember } from 'discord.js';
import { prisma } from './prisma';
import { calculateRiskPoints, NEW_ACCOUNT_DAYS } from './automodUtils';

export const JOINGUARD_RISK_THRESHOLD = 3;

export async function runJoinGuardCheck(member: GuildMember): Promise<void> {
	const config = await prisma.guildConfig.findUnique({ where: { guildId: member.guild.id } });
	if (!config?.joinGuardRoles.length) return;

	const existingSuspension = await prisma.suspendedUser.findUnique({
		where: { userId_guildId: { userId: member.id, guildId: member.guild.id } },
	});
	if (existingSuspension) return;

	const isNewAccount = Date.now() - member.user.createdTimestamp < NEW_ACCOUNT_DAYS * 86_400_000;
	const points = await calculateRiskPoints(member);
	const isSuspicious = points >= JOINGUARD_RISK_THRESHOLD;

	if (!isNewAccount && !isSuspicious) return;

	const roleIds = config.joinGuardRoles.filter((id) => member.guild.roles.cache.has(id));
	if (!roleIds.length) return;

	const reason = isSuspicious ? `JoinGuard: risk score ${points}/${JOINGUARD_RISK_THRESHOLD}` : 'JoinGuard: new account';

	for (const roleId of roleIds) {
		await member.roles.add(roleId, reason).catch(() => null);
	}
}
