import type { GuildMember } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';

const event: EventFile = {
	async execute(member: GuildMember) {
		if (member.pending) return;

		const config = await prisma.guildConfig.findUnique({ where: { guildId: member.guild.id } });
		if (!config?.restoreRoles) return;

		const snapshot = await prisma.roleSnapshot.findUnique({
			where: { userId_guildId: { userId: member.id, guildId: member.guild.id } },
		});
		if (!snapshot || snapshot.roleIds.length === 0) return;

		const validRoles = snapshot.roleIds.filter((id) => member.guild.roles.cache.has(id));
		if (validRoles.length === 0) return;

		await member.roles.add(validRoles).catch(() => null);
	},
};

export default event;
