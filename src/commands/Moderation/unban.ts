import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, Colors, EmbedBuilder } from 'discord.js';
import type { Command } from '../../lib/types';
import { buildModEmbed, resolveReason, sendModLog, sendPublicModLog } from '../../lib/modUtils';
import { prisma } from '../../lib/prisma';
import { applyMcModAction } from '../../lib/mcRcon';

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

		let mcPardoned: string | null = null;
		let mcError = false;
		try {
			mcPardoned = await applyMcModAction(interaction.guildId!, userId, 'unban', reason);
		} catch {
			mcError = true;
		}

		const embed = buildModEmbed({
			action: 'Member Unbanned',
			target: ban.user,
			moderator: interaction.user,
			reason,
			color: 0x77dd77,
		});

		const notes: string[] = [];
		if (mcPardoned) notes.push(`Minecraft ban also lifted and whitelist restored for \`${mcPardoned}\`.`);
		if (mcError) notes.push('Could not reach the Minecraft server.');
		if (notes.length) embed.setFooter({ text: notes.join(' ') });

		await Promise.all([sendModLog(interaction.guild!, embed), sendPublicModLog(interaction.guild!, embed)]);

		await interaction.editReply({ embeds: [embed] });
	},
};

export default command;
