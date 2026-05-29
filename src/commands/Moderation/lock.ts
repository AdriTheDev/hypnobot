import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, TextChannel, ChannelType } from 'discord.js';
import type { Command } from '../../lib/types';

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('lock')
		.setDescription('Lock a channel, preventing members from sending messages.')
		.addStringOption((opt) => opt.setName('reason').setDescription('Reason for the lock.').setRequired(true))
		.addChannelOption((opt) =>
			opt
				.setName('channel')
				.setDescription('Channel to lock (defaults to current).')
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(false),
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const channel = (interaction.options.getChannel('channel') ?? interaction.channel) as TextChannel;
		const reason = interaction.options.getString('reason', true);

		await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { SendMessages: false }, { reason });

		const embed = new EmbedBuilder()
			.setTitle('🔒 Channel Locked')
			.setDescription(reason)
			.setColor(0xff6961)
			.setFooter({ text: `Locked by ${interaction.user.tag}` })
			.setTimestamp();

		await channel.send({ embeds: [embed] });
		await interaction.editReply(`${channel} has been locked.`);
	},
};

export default command;
