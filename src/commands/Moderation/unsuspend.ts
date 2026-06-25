import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import type { Command } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { buildModEmbed, sendModLog, sendPublicModLog } from '../../lib/modUtils';

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

		if (!target.manageable) {
			await interaction.editReply("I do not have permission to manage that member's roles.");
			return;
		}

		const roleIds = suspension.roleIds.filter((id) => interaction.guild!.roles.cache.has(id));
		await target.roles.set(roleIds, reason);

		await prisma.suspendedUser.delete({
			where: { userId_guildId: { userId: target.id, guildId: interaction.guildId! } },
		});

		const embed = buildModEmbed({
			action: 'Member Unsuspended',
			target: target.user,
			moderator: interaction.user,
			reason,
			color: 0x77dd77,
		});

		await Promise.all([
			interaction.editReply({ embeds: [embed] }),
			sendModLog(interaction.guild!, embed),
			sendPublicModLog(interaction.guild!, embed),
		]);
	},
};

export default command;
