import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, Colors, EmbedBuilder } from 'discord.js';
import type { Command } from '../../lib/types';
import { buildModEmbed, resolveReason, sendModLog, sendPublicModLog } from '../../lib/modUtils';
import { prisma } from '../../lib/prisma';

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('unban')
		.setDescription('Unban a user from the server.')
		.addStringOption((opt) => opt.setName('user-id').setDescription('The ID of the user to unban.').setRequired(true))
		.addStringOption((opt) => opt.setName('reason').setDescription('Reason for the unban.').setRequired(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const userId = interaction.options.getString('user-id', true).trim();
		const rawReason = interaction.options.getString('reason', true);

		const ban = await interaction.guild!.bans.fetch(userId).catch(() => null);
		if (!ban) {
			await interaction.editReply('That user is not banned in this server.');
			return;
		}

		const reason = await resolveReason(interaction.guildId!, 'unban', rawReason);

		await interaction.guild!.bans.remove(userId, reason);
		await prisma.tempBan.deleteMany({
			where: { userId, guildId: interaction.guildId! },
		});

		const embed = buildModEmbed({
			action: 'Member Unbanned',
			target: ban.user,
			moderator: interaction.user,
			reason,
			color: 0x77dd77,
		});

		await Promise.all([sendModLog(interaction.guild!, embed), sendPublicModLog(interaction.guild!, embed)]);

		await interaction.editReply({ embeds: [embed] });
	},
};

export default command;
