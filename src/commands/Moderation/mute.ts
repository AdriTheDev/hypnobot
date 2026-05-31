import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, Colors, GuildMember } from 'discord.js';
import type { Command } from '../../lib/types';
import { resolveReason, buildModEmbed, sendModLog, sendPublicModLog, sendPunishmentDM } from '../../lib/modUtils';
import ms, { StringValue } from 'ms';

const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('mute')
		.setDescription('Timeout a member, preventing them from sending messages.')
		.addUserOption((opt) => opt.setName('user').setDescription('Member to mute.').setRequired(true))
		.addStringOption((opt) => opt.setName('duration').setDescription('Duration (e.g. 10m, 1h, 7d). Max 28 days.').setRequired(true))
		.addStringOption((opt) => opt.setName('reason').setDescription('Reason for the mute.').setRequired(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const targetUser = interaction.options.getUser('user', true);
		const durationStr = interaction.options.getString('duration', true);
		const rawReason = interaction.options.getString('reason', true);

		const member = await interaction.guild!.members.fetch(targetUser.id).catch(() => null);
		if (!member) {
			await interaction.editReply('That user is not in this server.');
			return;
		}

		if (!member.moderatable) {
			await interaction.editReply('I do not have permission to timeout that member.');
			return;
		}

		const interactionMember = interaction.member as GuildMember;
		if (member.roles.highest.position >= interactionMember.roles.highest.position) {
			await interaction.editReply('You cannot mute someone with an equal or higher role.');
			return;
		}

		const durationMs = ms(durationStr as StringValue);
		if (!durationMs) {
			await interaction.editReply('Invalid duration format. Examples: `10m`, `1h`, `7d`.');
			return;
		}

		if (durationMs > MAX_TIMEOUT_MS) {
			await interaction.editReply('Duration cannot exceed 28 days.');
			return;
		}

		const reason = await resolveReason(interaction.guildId!, 'mute', rawReason);
		const durationLabel = ms(durationMs, { long: true });

		await member.timeout(durationMs, reason);

		const dmSent = await sendPunishmentDM(targetUser, {
			action: 'mute',
			guildName: interaction.guild!.name,
			reason,
			duration: durationLabel,
		});

		const embed = buildModEmbed({
			action: 'Member Muted',
			target: targetUser,
			moderator: interaction.user,
			reason,
			duration: durationLabel,
			color: Colors.Orange,
		});

		if (!dmSent) embed.setFooter({ text: 'Could not send DM to the user.' });

		await Promise.all([sendModLog(interaction.guild!, embed), sendPublicModLog(interaction.guild!, embed)]);
		await interaction.editReply({ embeds: [embed] });
	},
};

export default command;
