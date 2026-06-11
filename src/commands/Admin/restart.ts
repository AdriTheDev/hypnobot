import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../lib/types';
import { logStatus } from '../../lib/statusWebhook';

const command: Command = {
	data: new SlashCommandBuilder().setName('restart').setDescription('Restart the bot.'),

	ownerOnly: true,

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });
		await logStatus('Bot Restarting', `Restart triggered by **${interaction.user.tag}**.`, 0xffc067);
		await interaction.editReply('Restarting...');
		process.exit(0);
	},
};

export default command;
