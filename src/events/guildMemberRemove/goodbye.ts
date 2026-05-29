import { GuildMember, PartialGuildMember, EmbedBuilder } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';

const event: EventFile = {
	async execute(member: GuildMember | PartialGuildMember) {
		const config = await prisma.guildConfig.findUnique({ where: { guildId: member.guild.id } });
		if (!config?.goodbyeChannel) return;

		const channel = member.guild.channels.cache.get(config.goodbyeChannel);
		if (!channel?.isTextBased()) return;

		const embed = new EmbedBuilder()
			.setTitle(`${member.user?.globalName ?? 'A member'} has left :(`)
			.setDescription(
				`**${member.user?.globalName ?? 'A member'}** has left the server. We now have \`${member.guild.memberCount}\` members.`,
			)
			.setThumbnail(member.user?.displayAvatarURL() ?? null)
			.setColor(0xfd86f3);

		await channel.send({ embeds: [embed] }).catch(() => null);
	},
};

export default event;
