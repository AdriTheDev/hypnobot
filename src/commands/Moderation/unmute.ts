import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../lib/types';
import { resolveReason, buildModEmbed, sendModLog, sendPublicModLog, sendPunishmentDM } from '../../lib/modUtils';

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

		const reason = await resolveReason(interaction.guildId!, 'unmute', rawReason);

		await member.timeout(null, reason);

		const dmSent = await sendPunishmentDM(targetUser, {
			action: 'unmute',
			guildName: interaction.guild!.name,
			reason,
		});

		const embed = buildModEmbed({
			action: 'Member Unmuted',
			target: targetUser,
			moderator: interaction.user,
			reason,
			color: 0x77dd77,
		});

		if (!dmSent) embed.setFooter({ text: 'Could not send DM to the user.' });

		await Promise.all([sendModLog(interaction.guild!, embed), sendPublicModLog(interaction.guild!, embed)]);
		await interaction.editReply({ embeds: [embed] });
	},
};

export default command;
