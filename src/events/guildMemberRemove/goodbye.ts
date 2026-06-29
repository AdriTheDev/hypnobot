import { GuildMember, PartialGuildMember, EmbedBuilder } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { resolvePlaceholders } from '../../lib/memberActions';

const DEFAULT_GOODBYE_MESSAGE = `**{displayname}** has left the server. We now have \`{membercount}\` members.`;

const event: EventFile = {
	async execute(member: GuildMember | PartialGuildMember) {
		const config = await prisma.guildConfig.findUnique({ where: { guildId: member.guild.id } });
		if (!config?.goodbyeChannel) return;

		const channel = member.guild.channels.cache.get(config.goodbyeChannel);
		if (!channel?.isTextBased()) return;

		const user = member.user;
		const memberLike = {
			id: member.id,
			user: {
				username: user?.username ?? 'unknown',
				globalName: user?.globalName ?? null,
			},
		};

		const description = resolvePlaceholders(config.goodbyeMessage ?? DEFAULT_GOODBYE_MESSAGE, memberLike, member.guild);

		const displayName = user?.globalName ?? user?.username ?? 'A member';

		const embed = new EmbedBuilder()
			.setTitle(`${displayName} has left :(`)
			.setDescription(description)
			.setThumbnail(user?.displayAvatarURL() ?? null)
			.setColor(0xfd86f3);

		await channel.send({ embeds: [embed] }).catch(() => null);
	},
};

export default event;
