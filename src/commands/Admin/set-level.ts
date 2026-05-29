import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { totalXPForLevel } from '../../lib/levelingUtils';

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('set-level')
		.setDescription("Override a member's level.")
		.addUserOption((opt) => opt.setName('user').setDescription('Member to update.').setRequired(true))
		.addIntegerOption((opt) => opt.setName('level').setDescription('New level.').setMinValue(0).setRequired(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const targetUser = interaction.options.getUser('user', true);
		const level = interaction.options.getInteger('level', true);
		const xp = totalXPForLevel(level);

		await prisma.userLevel.upsert({
			where: {
				userId_guildId: {
					userId: targetUser.id,
					guildId: interaction.guildId!,
				},
			},
			create: {
				userId: targetUser.id,
				guildId: interaction.guildId!,
				xp,
				level,
			},
			update: { xp, level },
		});

		await interaction.editReply(`Set ${targetUser}'s level to **${level}** (${xp.toLocaleString()} XP).`);
	},
};

export default command;
