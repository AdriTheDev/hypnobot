import { GuildMember, PartialGuildMember, EmbedBuilder } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { sendLog } from '../../lib/logWebhook';

const event: EventFile = {
	async execute(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
		if (oldMember.nickname === newMember.nickname) return;

		const config = await prisma.guildConfig.findUnique({ where: { guildId: newMember.guild.id } });
		if (!config?.memberLogChannel) return;

		const embed = new EmbedBuilder()
			.setTitle('Nickname Changed')
			.setColor(0xaec6cf)
			.setThumbnail(newMember.user.displayAvatarURL())
			.addFields(
				{ name: 'User', value: `${newMember} (\`${newMember.id}\`)` },
				{ name: 'Before', value: oldMember.nickname ?? '*None*', inline: true },
				{ name: 'After', value: newMember.nickname ?? '*None*', inline: true },
			)
			.setTimestamp();

		await sendLog(newMember.guild, config.memberLogChannel, embed);
	},
};

export default event;
