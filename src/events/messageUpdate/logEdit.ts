import { Message, PartialMessage, EmbedBuilder } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { sendLog } from '../../lib/logWebhook';

const event: EventFile = {
	async execute(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) {
		if (!newMessage.guild || newMessage.author?.bot || newMessage.webhookId) return;
		const before = oldMessage.content ?? null;
		const after = newMessage.content ?? null;
		if (before === after || !after) return;

		const config = await prisma.guildConfig.findUnique({ where: { guildId: newMessage.guild.id } });
		if (!config?.messageLogChannel) return;

		const embed = new EmbedBuilder()
			.setTitle('Message Edited')
			.setColor(0xffc067)
			.setURL(newMessage.url)
			.addFields(
				{
					name: 'Author',
					value: newMessage.author ? `${newMessage.author} (\`${newMessage.author.id}\`)` : 'Unknown',
					inline: true,
				},
				{ name: 'Channel', value: `<#${newMessage.channelId}>`, inline: true },
				{ name: 'Before', value: before?.slice(0, 1024) ?? '*Not cached*' },
				{ name: 'After', value: after.slice(0, 1024) },
			)
			.setFooter({ text: `Message ID: ${newMessage.id}` })
			.setTimestamp();

		await sendLog(newMessage.guild, config.messageLogChannel, embed);
	},
};

export default event;
