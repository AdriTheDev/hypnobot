import type { GuildMember, PartialGuildMember } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { rconCommand } from '../../lib/mcRcon';

const event: EventFile = {
	async execute(member: GuildMember | PartialGuildMember) {
		const entry = await prisma.minecraftWhitelist.findUnique({
			where: { userId_guildId: { userId: member.id, guildId: member.guild.id } },
		});
		if (!entry) return;

		await rconCommand(`whitelist remove ${entry.minecraftUsername}`).catch(() => null);

		await prisma.minecraftWhitelist.delete({
			where: { userId_guildId: { userId: member.id, guildId: member.guild.id } },
		});
	},
};

export default event;
