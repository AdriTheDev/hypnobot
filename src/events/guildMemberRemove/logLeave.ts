import { GuildMember, PartialGuildMember, EmbedBuilder, time, TimestampStyles } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { sendLog } from '../../lib/botStatus';

const event: EventFile = {
	async execute(member: GuildMember | PartialGuildMember) {
		if (!member.user) return;

		const config = await prisma.guildConfig.findUnique({ where: { guildId: member.guild.id } });
		if (!config?.memberLogChannel) return;

		const roles = member.roles.cache
			.filter((r) => r.id !== member.guild.id)
			.map((r) => r.toString())
			.join(', ');

		const embed = new EmbedBuilder()
			.setTitle('Member Left')
			.setColor(0xff6961)
			.setThumbnail(member.user.displayAvatarURL())
			.addFields(
				{ name: 'User', value: `${member.user} (\`${member.id}\`)`, inline: true },
				{ name: 'Member Count', value: `\`${member.guild.memberCount}\``, inline: true },
				{ name: 'Joined', value: member.joinedAt ? time(member.joinedAt, TimestampStyles.RelativeTime) : 'Unknown' },
			)
			.setTimestamp();

		if (roles) embed.addFields({ name: 'Roles', value: roles.slice(0, 1024) });

		await sendLog(member.guild, config.memberLogChannel, embed);
	},
};

export default event;
