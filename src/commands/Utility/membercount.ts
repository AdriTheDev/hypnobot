import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../lib/types';

const command: Command = {
	data: new SlashCommandBuilder().setName('membercount').setDescription("Show the server's member count."),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const guild = interaction.guild!;
		const bots = guild.members.cache.filter((m) => m.user.bot).size;
		const humans = guild.memberCount - bots;

		const embed = new EmbedBuilder()
			.setColor(0xfd86f3)
			.setAuthor({ name: guild.name, iconURL: guild.iconURL() ?? undefined })
			.addFields(
				{ name: 'Total', value: `\`${guild.memberCount.toLocaleString()}\``, inline: true },
				{ name: 'Humans', value: `\`${humans.toLocaleString()}\``, inline: true },
				{ name: 'Bots', value: `\`${bots.toLocaleString()}\``, inline: true },
			)
			.setTimestamp();

		await interaction.editReply({ embeds: [embed] });
	},
};

export default command;
