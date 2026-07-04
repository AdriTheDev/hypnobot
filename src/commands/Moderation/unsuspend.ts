import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import type { Command } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { checkModerationPermissions, reversePunishment } from '../../lib/moderationActions';

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('unsuspend')
		.setDescription('Unsuspend a member, restoring their previous roles.')
		.addUserOption((opt) => opt.setName('user').setDescription('Member to unsuspend.').setRequired(true))
		.addStringOption((opt) => opt.setName('reason').setDescription('Reason for lifting the suspension.').setRequired(false))
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const target = interaction.options.getMember('user') as GuildMember | null;
		const reason = interaction.options.getString('reason') ?? 'Suspension lifted';

		if (!target) {
			await interaction.editReply('That user is not in this server.');
			return;
		}

		const suspension = await prisma.suspendedUser.findUnique({
			where: { userId_guildId: { userId: target.id, guildId: interaction.guildId! } },
		});

		if (!suspension) {
			await interaction.editReply('That member is not suspended.');
			return;
		}

		const moderatorMember = interaction.member as GuildMember;
		const permCheck = checkModerationPermissions({
			action: 'unsuspend',
			guild: interaction.guild!,
			moderatorMember,
			target,
			targetUser: target.user,
		});
		if (!permCheck.ok) {
			await interaction.editReply(permCheck.message);
			return;
		}

		const result = await reversePunishment({
			action: 'unsuspend',
			guild: interaction.guild!,
			targetUser: target.user,
			targetMember: target,
			moderator: { user: interaction.user, member: moderatorMember },
			reason,
		});

		if (!result.ok) {
			await interaction.editReply(result.failureMessage ?? 'Could not unsuspend that member.');
			return;
		}

		await interaction.editReply({ embeds: [result.embed!] });
	},
};

export default command;
