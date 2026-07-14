import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../lib/types';
import { buildLeaderboardEmbed } from '../../lib/leveling';

const command: Command = {
	data: new SlashCommandBuilder().setName('leaderboard').setDescription('Show the top 10 members by XP in this server.'),

	cooldown: 15,

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply();
		const embed = await buildLeaderboardEmbed(interaction.guild!);
		await interaction.editReply({ embeds: [embed] });
	},
};

export default command;
