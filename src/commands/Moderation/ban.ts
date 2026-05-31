import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import type { Command } from '../../lib/types';
import { resolveReason, buildModEmbed, sendModLog, sendPublicModLog, sendPunishmentDM } from '../../lib/modUtils';
import { prisma } from '../../lib/prisma';
import ms, { StringValue } from 'ms';

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('ban')
		.setDescription('Ban a user from the server.')
		.addUserOption((opt) => opt.setName('user').setDescription('User to ban.').setRequired(true))
		.addStringOption((opt) => opt.setName('reason').setDescription('Reason for the ban.').setRequired(true))
		.addStringOption((opt) => opt.setName('duration').setDescription('Duration (e.g. 7d, 24h). Omit for permanent.').setRequired(false))
		.addIntegerOption((opt) =>
			opt.setName('delete-days').setDescription('Days of messages to delete (0-7).').setMinValue(0).setMaxValue(7).setRequired(false),
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const targetUser = interaction.options.getUser('user', true);
		const rawReason = interaction.options.getString('reason', true);
		const durationStr = interaction.options.getString('duration');
		const deleteDays = interaction.options.getInteger('delete-days') ?? 0;

		const member = await interaction.guild!.members.fetch(targetUser.id).catch(() => null);

		if (member) {
			if (!member.bannable) {
				await interaction.editReply('I do not have permission to ban that member.');
				return;
			}
			const interactionMember = interaction.member as GuildMember;
			if (member.roles.highest.position >= interactionMember.roles.highest.position) {
				await interaction.editReply('You cannot ban someone with an equal or higher role.');
				return;
			}
		}

		const reason = await resolveReason(interaction.guildId!, 'ban', rawReason);

		let durationMs: number | null = null;
		let durationLabel: string | undefined;
		if (durationStr) {
			durationMs = ms(durationStr as StringValue);
			if (!durationMs) {
				await interaction.editReply('Invalid duration format. Examples: `7d`, `24h`, `30m`.');
				return;
			}
			durationLabel = ms(durationMs, { long: true });
		}

		const dmSent = await sendPunishmentDM(targetUser, {
			action: 'ban',
			guildName: interaction.guild!.name,
			reason,
			duration: durationLabel ?? 'Permanent',
		});

		await interaction.guild!.bans.create(targetUser.id, {
			reason,
			deleteMessageSeconds: deleteDays * 86400,
		});

		if (durationMs) {
			await prisma.tempBan.upsert({
				where: { userId_guildId: { userId: targetUser.id, guildId: interaction.guildId! } },
				create: {
					userId: targetUser.id,
					guildId: interaction.guildId!,
					reason,
					moderatorId: interaction.user.id,
					expiresAt: new Date(Date.now() + durationMs),
				},
				update: {
					reason,
					moderatorId: interaction.user.id,
					expiresAt: new Date(Date.now() + durationMs),
				},
			});
		}

		const embed = buildModEmbed({
			action: 'Member Banned',
			target: targetUser,
			moderator: interaction.user,
			reason,
			duration: durationLabel ?? 'Permanent',
			color: 0xff6961,
		});

		if (!dmSent) embed.setFooter({ text: 'Could not send DM to the user.' });

		await Promise.all([sendModLog(interaction.guild!, embed), sendPublicModLog(interaction.guild!, embed)]);
		await interaction.editReply({ embeds: [embed] });
	},
};

export default command;
