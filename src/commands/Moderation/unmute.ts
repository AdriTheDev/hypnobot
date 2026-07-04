import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import type { Command } from '../../lib/types';
import { resolveReason } from '../../lib/modUtils';
import { checkModerationPermissions, reversePunishment } from '../../lib/moderationActions';

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('unmute')
		.setDescription('Remove a timeout from a member.')
		.addUserOption((opt) => opt.setName('user').setDescription('Member to unmute.').setRequired(true))
		.addStringOption((opt) => opt.setName('reason').setDescription('Reason for the unmute.').setRequired(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const targetUser = interaction.options.getUser('user', true);
		const rawReason = interaction.options.getString('reason', true);
		const member = await interaction.guild!.members.fetch(targetUser.id).catch(() => null);

		if (!member) {
			await interaction.editReply('That user is not in this server.');
			return;
		}

		if (!member.isCommunicationDisabled()) {
			await interaction.editReply('That member is not muted.');
			return;
		}

		const moderatorMember = interaction.member as GuildMember;
		const permCheck = checkModerationPermissions({
			action: 'unmute',
			guild: interaction.guild!,
			moderatorMember,
			target: member,
			targetUser,
		});
		if (!permCheck.ok) {
			await interaction.editReply(permCheck.message);
			return;
		}

		const reason = await resolveReason(interaction.guildId!, 'unmute', rawReason);

		const result = await reversePunishment({
			action: 'unmute',
			guild: interaction.guild!,
			targetUser,
			targetMember: member,
			moderator: { user: interaction.user, member: moderatorMember },
			reason,
		});

		if (!result.ok) {
			await interaction.editReply(result.failureMessage ?? 'Could not unmute that member.');
			return;
		}

		await interaction.editReply({ embeds: [result.embed!] });
	},
};

export default command;
