import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import type { Command } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { checkModerationPermissions, applyPunishment, DEFAULT_SUSPENSION_DURATION_MS } from '../../lib/moderationActions';
import ms, { StringValue } from 'ms';

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('suspend')
		.setDescription('Suspend a member, removing all their roles and assigning the Suspended role.')
		.addUserOption((opt) => opt.setName('user').setDescription('Member to suspend.').setRequired(true))
		.addStringOption((opt) => opt.setName('reason').setDescription('Reason for the suspension.').setRequired(false))
		.addStringOption((opt) =>
			opt.setName('duration').setDescription('Duration (e.g. 7d, 24h, permanent). Defaults to 7d.').setRequired(false),
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const target = interaction.options.getMember('user') as GuildMember | null;
		const reason = interaction.options.getString('reason') ?? 'No reason provided';
		const durationStr = interaction.options.getString('duration');

		if (!target) {
			await interaction.editReply('That user is not in this server.');
			return;
		}

		const moderatorMember = interaction.member as GuildMember;
		const permCheck = checkModerationPermissions({
			action: 'suspend',
			guild: interaction.guild!,
			moderatorMember,
			target,
			targetUser: target.user,
		});
		if (!permCheck.ok) {
			await interaction.editReply(permCheck.message);
			return;
		}

		const existing = await prisma.suspendedUser.findUnique({
			where: { userId_guildId: { userId: target.id, guildId: interaction.guildId! } },
		});
		if (existing) {
			await interaction.editReply('That member is already suspended.');
			return;
		}

		let durationMs: number | undefined = DEFAULT_SUSPENSION_DURATION_MS;
		if (durationStr) {
			if (/^perm(anent)?$/i.test(durationStr.trim())) {
				durationMs = undefined;
			} else {
				const parsed = ms(durationStr as StringValue);
				if (!parsed) {
					await interaction.editReply('Invalid duration format. Examples: `7d`, `24h`, `30m`, `permanent`.');
					return;
				}
				durationMs = parsed;
			}
		}

		const result = await applyPunishment({
			action: 'suspend',
			guild: interaction.guild!,
			targetUser: target.user,
			targetMember: target,
			moderator: { user: interaction.user, member: moderatorMember },
			reason,
			durationMs,
		});

		if (!result.ok) {
			await interaction.editReply(result.failureMessage ?? 'Could not suspend that member.');
			return;
		}

		await interaction.editReply({ embeds: [result.embed!] });
	},
};

export default command;
