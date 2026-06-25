import type { GuildMember } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';

const event: EventFile = {
	async execute(member: GuildMember) {
		await prisma.userLevel
			.updateMany({
				where: { userId: member.id, guildId: member.guild.id },
				data: { leftGuildAt: null },
			})
			.catch(() => null);
	},
};

export default event;
