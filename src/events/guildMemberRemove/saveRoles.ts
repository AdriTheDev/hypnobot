import type { GuildMember, PartialGuildMember } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';

const event: EventFile = {
	async execute(member: GuildMember | PartialGuildMember) {
		const config = await prisma.guildConfig.findUnique({ where: { guildId: member.guild.id } });
		if (!config?.restoreRoles) return;

		const full = member.partial ? await member.fetch().catch(() => null) : member;
		if (!full) return;

		const roleIds = full.roles.cache.filter((r) => r.id !== member.guild.id && !r.managed).map((r) => r.id);

		if (roleIds.length === 0) return;

		await prisma.roleSnapshot.upsert({
			where: { userId_guildId: { userId: member.id, guildId: member.guild.id } },
			create: { userId: member.id, guildId: member.guild.id, roleIds },
			update: { roleIds, savedAt: new Date() },
		});
	},
};

export default event;
