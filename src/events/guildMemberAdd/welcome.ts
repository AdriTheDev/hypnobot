import { GuildMember, EmbedBuilder } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';

const event: EventFile = {
	async execute(member: GuildMember) {
		const config = await prisma.guildConfig.findUnique({ where: { guildId: member.guild.id } });
		if (!config?.welcomeChannel) return;

		const channel = member.guild.channels.cache.get(config.welcomeChannel);
		if (!channel?.isTextBased()) return;

		const embed = new EmbedBuilder()
			.setTitle(`Welcome to ${member.guild.name}!`)
			.setDescription(
				`Hey ${member}, welcome to the server! We're glad to have you here.\nYou are member \`${member.guild.memberCount}\`.\nMake sure to read the <#1451972624107311124> and introduce yourself in <#1454976402339135589>!`,
			)
			.setThumbnail(member.user.displayAvatarURL())
			.setColor(0xfd86f3);

		const message = await channel.send({ content: `${member}`, embeds: [embed] }).catch(() => null);
		if (!message) return;

		await prisma.welcomeMessage.upsert({
			where: { userId_guildId: { userId: member.id, guildId: member.guild.id } },
			create: { userId: member.id, guildId: member.guild.id, channelId: channel.id, messageId: message.id },
			update: { channelId: channel.id, messageId: message.id },
		});
	},
};

export default event;
