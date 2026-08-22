import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../lib/types';

const command: Command = {
	data: new SlashCommandBuilder().setName('membercount').setDescription("Show the server's member count."),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply();

		const guild = interaction.guild!;

		const embed = new EmbedBuilder()
			.setColor(0xfd86f3)
			.setAuthor({ name: guild.name, iconURL: guild.iconURL() ?? undefined })
			.addFields({ name: 'Members', value: `\`${guild.memberCount.toLocaleString()}\`` })
			.setTimestamp();

		await interaction.editReply({ embeds: [embed] });
	},
};

export default command;
