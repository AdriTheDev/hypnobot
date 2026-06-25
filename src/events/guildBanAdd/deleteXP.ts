import type { GuildBan } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';

const event: EventFile = {
	async execute(ban: GuildBan) {
		await prisma.userLevel
			.deleteMany({ where: { userId: ban.user.id, guildId: ban.guild.id } })
			.catch(() => null);
	},
};

export default event;
