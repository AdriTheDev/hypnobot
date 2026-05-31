import { SlashCommandBuilder, ChatInputCommandInteraction, ChannelType, TextChannel } from 'discord.js';
import type { Command } from '../../lib/types';

const MESSAGE_URL_RE = /https:\/\/discord(?:app)?\.com\/channels\/\d+\/(\d+)\/(\d+)/;

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('say')
		.setDescription('Send a message as the bot.')
		.addStringOption((opt) =>
			opt.setName('message').setDescription('Message content to send.').setRequired(true).setMaxLength(2000),
		)
		.addChannelOption((opt) =>
			opt
				.setName('channel')
				.setDescription('Channel to send in (defaults to current).')
				.addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
				.setRequired(false),
		)
		.addStringOption((opt) =>
			opt.setName('reply-to').setDescription('Message ID or URL to reply to.').setRequired(false),
		),

	ownerOnly: true,

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const content = interaction.options.getString('message', true);
		const replyToStr = interaction.options.getString('reply-to');
		const channelOpt = interaction.options.getChannel('channel');

		let sendChannel = (channelOpt ?? interaction.channel) as TextChannel;
		let replyMessageId: string | null = null;

		if (replyToStr) {
			const match = replyToStr.match(MESSAGE_URL_RE);
			if (match) {
				const resolvedChannel = interaction.guild!.channels.cache.get(match[1]) as TextChannel | null;
				if (!resolvedChannel) {
					await interaction.editReply('Could not find the channel from that message URL.');
					return;
				}
				sendChannel = resolvedChannel;
				replyMessageId = match[2];
			} else {
				replyMessageId = replyToStr;
			}

			const exists = await sendChannel.messages.fetch(replyMessageId).catch(() => null);
			if (!exists) {
				await interaction.editReply('Could not find that message.');
				return;
			}
		}

		await sendChannel.send({
			content,
			...(replyMessageId ? { reply: { messageReference: replyMessageId, failIfNotExists: false } } : {}),
		});

		await interaction.editReply('Message sent.');
	},
};

export default command;
