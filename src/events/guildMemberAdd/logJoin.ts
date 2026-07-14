import { GuildMember, EmbedBuilder, time, TimestampStyles } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { sendLog } from '../../lib/botStatus';
import { getGuildInvites, setGuildInvites } from '../../lib/memberActions';

const event: EventFile = {
	async execute(member: GuildMember) {
		const config = await prisma.guildConfig.findUnique({ where: { guildId: member.guild.id } });
		if (!config?.memberLogChannel) return;

		const cachedInvites = getGuildInvites(member.guild.id);
		const currentInvites = await member.guild.invites.fetch().catch(() => null);
		if (currentInvites) setGuildInvites(member.guild.id, currentInvites);

		const usedInvite =
			cachedInvites && currentInvites
				? currentInvites.find((inv) => {
						const cached = cachedInvites.get(inv.code);
						return cached !== undefined && (inv.uses ?? 0) > cached;
					})
				: null;

		const embed = new EmbedBuilder()
			.setTitle('Member Joined')
			.setColor(0x77dd77)
			.setThumbnail(member.user.displayAvatarURL())
			.addFields(
				{ name: 'User', value: `${member} (\`${member.id}\`)`, inline: true },
				{ name: 'Member Count', value: `\`${member.guild.memberCount}\``, inline: true },
				{ name: 'Account Created', value: time(member.user.createdAt, TimestampStyles.RelativeTime) },
			)
			.setTimestamp();

		if (usedInvite) {
			embed.addFields(
				{ name: 'Invite', value: `\`${usedInvite.code}\``, inline: true },
				{ name: '\u200B', value: '\u200B', inline: true },
				{
					name: 'Inviter',
					value: usedInvite.inviter ? `${usedInvite.inviter} (\`${usedInvite.inviter.id}\`)` : 'Unknown',
					inline: true,
				},
			);
		}

		await sendLog(member.guild, config.memberLogChannel, embed);
	},
};

export default event;
