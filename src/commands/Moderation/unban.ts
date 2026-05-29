import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, Colors, EmbedBuilder } from 'discord.js';
import type { Command } from '../../lib/types';
import { resolveReason, sendModLog } from '../../lib/modUtils';
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

		const embed = new EmbedBuilder()
			.setTitle('Member Unbanned')
			.setColor(0x77dd77)
			.addFields(
				{
					name: 'User',
					value: `${ban.user.tag} (\`${userId}\`)`,
					inline: true,
				},
				{
					name: 'Moderator',
					value: `${interaction.user}`,
					inline: true,
				},
				{ name: 'Reason', value: reason },
			)
			.setTimestamp();

		await sendModLog(interaction.guild!, embed);
		await interaction.editReply({ embeds: [embed] });
	},
};

export default command;
