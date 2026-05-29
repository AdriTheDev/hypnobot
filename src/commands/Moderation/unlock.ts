import {
	SlashCommandBuilder,
	PermissionFlagsBits,
	ChatInputCommandInteraction,
	Colors,
	EmbedBuilder,
	TextChannel,
	ChannelType,
} from 'discord.js';
import type { Command } from '../../lib/types';

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('unlock')
		.setDescription('Unlock a previously locked channel.')
		.addStringOption((opt) => opt.setName('reason').setDescription('Reason for the unlock.').setRequired(true))
		.addChannelOption((opt) =>
			opt
				.setName('channel')
				.setDescription('Channel to unlock (defaults to current).')
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(false),
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const channel = (interaction.options.getChannel('channel') ?? interaction.channel) as TextChannel;
		const reason = interaction.options.getString('reason', true);

		await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { SendMessages: null }, { reason });

		const embed = new EmbedBuilder()
			.setTitle('🔓 Channel Unlocked')
			.setDescription(reason)
			.setColor(Colors.Green)
			.setFooter({ text: `Unlocked by ${interaction.user.tag}` })
			.setTimestamp();

		await channel.send({ embeds: [embed] });
		await interaction.editReply(`${channel} has been unlocked.`);
	},
};

export default command;
