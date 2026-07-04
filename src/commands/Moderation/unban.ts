import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import type { Command } from '../../lib/types';
import { resolveReason } from '../../lib/modUtils';
import { checkModerationPermissions, reversePunishment } from '../../lib/moderationActions';

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

		const moderatorMember = interaction.member as GuildMember;
		const permCheck = checkModerationPermissions({
			action: 'unban',
			guild: interaction.guild!,
			moderatorMember,
			target: null,
			targetUser: ban.user,
		});
		if (!permCheck.ok) {
			await interaction.editReply(permCheck.message);
			return;
		}

		const reason = await resolveReason(interaction.guildId!, 'unban', rawReason);

		const result = await reversePunishment({
			action: 'unban',
			guild: interaction.guild!,
			targetUser: ban.user,
			targetMember: null,
			moderator: { user: interaction.user, member: moderatorMember },
			reason,
			sendDm: false,
		});

		if (!result.ok) {
			await interaction.editReply(result.failureMessage ?? 'Could not unban that user.');
			return;
		}

		await interaction.editReply({ embeds: [result.embed!] });
	},
};

export default command;
