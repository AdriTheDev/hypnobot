import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import type { Command } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { buildModEmbed, sendModLog, sendPublicModLog } from '../../lib/modUtils';

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('suspend')
		.setDescription('Suspend a member, removing all their roles and assigning the Suspended role.')
		.addUserOption((opt) => opt.setName('user').setDescription('Member to suspend.').setRequired(true))
		.addStringOption((opt) => opt.setName('reason').setDescription('Reason for the suspension.').setRequired(false))
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const target = interaction.options.getMember('user') as GuildMember | null;
		const reason = interaction.options.getString('reason') ?? 'No reason provided';

		if (!target) {
			await interaction.editReply('That user is not in this server.');
			return;
		}

		if (target.id === interaction.user.id) {
			await interaction.editReply('You cannot suspend yourself.');
			return;
		}

		if (target.id === interaction.guild!.ownerId) {
			await interaction.editReply('You cannot suspend the server owner.');
			return;
		}

		const moderator = interaction.member as GuildMember;
		if (target.roles.highest.position >= moderator.roles.highest.position) {
			await interaction.editReply('You cannot suspend a member with an equal or higher role.');
			return;
		}

		if (!target.manageable) {
			await interaction.editReply("I do not have permission to manage that member's roles.");
			return;
		}

		const existing = await prisma.suspendedUser.findUnique({
			where: { userId_guildId: { userId: target.id, guildId: interaction.guildId! } },
		});
		if (existing) {
			await interaction.editReply('That member is already suspended.');
			return;
		}

		let suspendedRole = interaction.guild!.roles.cache.find((r) => r.name === 'Suspended');
		if (!suspendedRole) {
			suspendedRole = await interaction.guild!.roles.create({
				name: 'Suspended',
				color: 0x808080,
				reason: 'Auto-created for suspension system',
			});
		}

		const roleIds = target.roles.cache.filter((r) => r.id !== interaction.guildId!).map((r) => r.id);

		await prisma.suspendedUser.create({
			data: {
				userId: target.id,
				guildId: interaction.guildId!,
				roleIds,
				moderatorId: interaction.user.id,
				reason,
			},
		});

		await target.roles.set([suspendedRole], reason);

		const embed = buildModEmbed({
			action: 'Member Suspended',
			target: target.user,
			moderator: interaction.user,
			reason,
			color: 0xff6961,
		});

		await Promise.all([
			interaction.editReply({ embeds: [embed] }),
			sendModLog(interaction.guild!, embed),
			sendPublicModLog(interaction.guild!, embed),
		]);
	},
};

export default command;
