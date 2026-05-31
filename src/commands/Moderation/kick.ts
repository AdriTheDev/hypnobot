import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import type { Command } from '../../lib/types';
import { resolveReason, buildModEmbed, sendModLog, sendPublicModLog, sendPunishmentDM } from '../../lib/modUtils';

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('kick')
		.setDescription('Kick a member from the server.')
		.addUserOption((opt) => opt.setName('user').setDescription('Member to kick.').setRequired(true))
		.addStringOption((opt) => opt.setName('reason').setDescription('Reason for the kick.').setRequired(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const targetUser = interaction.options.getUser('user', true);
		const rawReason = interaction.options.getString('reason', true);
		const member = await interaction.guild!.members.fetch(targetUser.id).catch(() => null);

		if (!member) {
			await interaction.editReply('That user is not in this server.');
			return;
		}

		if (!member.kickable) {
			await interaction.editReply('I do not have permission to kick that member.');
			return;
		}

		const interactionMember = interaction.member as GuildMember;
		if (member.roles.highest.position >= interactionMember.roles.highest.position) {
			await interaction.editReply('You cannot kick someone with an equal or higher role.');
			return;
		}

		const reason = await resolveReason(interaction.guildId!, 'kick', rawReason);

		const dmSent = await sendPunishmentDM(targetUser, {
			action: 'kick',
			guildName: interaction.guild!.name,
			reason,
		});

		await member.kick(reason);

		const embed = buildModEmbed({
			action: 'Member Kicked',
			target: targetUser,
			moderator: interaction.user,
			reason,
			color: 0xff6961,
		});

		if (!dmSent) embed.setFooter({ text: 'Could not send DM to the user.' });

		await Promise.all([sendModLog(interaction.guild!, embed), sendPublicModLog(interaction.guild!, embed)]);
		await interaction.editReply({ embeds: [embed] });
	},
};

export default command;
