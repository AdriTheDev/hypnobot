import { Message, PartialMessage, EmbedBuilder } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { sendLog } from '../../lib/logWebhook';

const event: EventFile = {
	async execute(message: Message | PartialMessage) {
		if (!message.guild || message.author?.bot || message.webhookId) return;

		const config = await prisma.guildConfig.findUnique({ where: { guildId: message.guild.id } });
		if (!config?.messageLogChannel) return;

		await new Promise((r) => setTimeout(r, 2000));

		const pkRes = await fetch(`https://api.pluralkit.me/v2/messages/${message.id}`).catch(() => null);
		if (pkRes?.ok) return;

		const embed = new EmbedBuilder()
			.setTitle('Message Deleted')
			.setColor(0xff6961)
			.addFields(
				{
					name: 'Author',
					value: message.author ? `${message.author} (\`${message.author.id}\`)` : 'Unknown',
					inline: true,
				},
				{ name: 'Channel', value: `<#${message.channelId}>`, inline: true },
			)
			.setFooter({ text: `Message ID: ${message.id}` })
			.setTimestamp();

		if (message.content) {
			embed.addFields({ name: 'Content', value: message.content.slice(0, 1024) });
		}

		if (message.attachments.size) {
			embed.addFields({
				name: 'Attachments',
				value: message.attachments.map((a) => a.name).join(', '),
			});
		}

		await sendLog(message.guild, config.messageLogChannel, embed);
	},
};

export default event;
