import type { GuildMember, PartialGuildMember } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';

const event: EventFile = {
	async execute(member: GuildMember | PartialGuildMember) {
		await prisma.userLevel
			.updateMany({
				where: { userId: member.id, guildId: member.guild.id },
				data: { leftGuildAt: new Date() },
			})
			.catch(() => null);
	},
};

export default event;
