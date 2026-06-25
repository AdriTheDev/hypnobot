import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../lib/types';
import { prisma } from '../../lib/prisma';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('purge-xp')
		.setDescription('Delete XP records for members who left more than 30 days ago.')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);

		const { count } = await prisma.userLevel.deleteMany({
			where: {
				guildId: interaction.guildId!,
				leftGuildAt: { lte: cutoff },
			},
		});

		await interaction.editReply(
			count === 0
				? 'No XP records found for members who left more than 30 days ago.'
				: `Purged XP data for **${count}** member${count === 1 ? '' : 's'} who left more than 30 days ago.`,
		);
	},
};

export default command;
