import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import type { Command } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { buildModEmbed, sendModLog, sendPublicModLog, getLinkedAccounts } from '../../lib/modUtils';
import { scheduleSuspension } from '../../lib/suspendScheduler';
import ms, { StringValue } from 'ms';

const DEFAULT_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('suspend')
		.setDescription('Suspend a member, removing all their roles and assigning the Suspended role.')
		.addUserOption((opt) => opt.setName('user').setDescription('Member to suspend.').setRequired(true))
		.addStringOption((opt) => opt.setName('reason').setDescription('Reason for the suspension.').setRequired(false))
		.addStringOption((opt) => opt.setName('duration').setDescription('Duration (e.g. 7d, 24h). Defaults to 7d.').setRequired(false))
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

		let durationMs = DEFAULT_DURATION_MS;
		if (durationStr) {
			const parsed = ms(durationStr as StringValue);
			if (!parsed) {
				await interaction.editReply('Invalid duration format. Examples: `7d`, `24h`, `30m`.');
				return;
			}
			durationMs = parsed;
		}

		const durationLabel = ms(durationMs, { long: true });
		const expiresAt = new Date(Date.now() + durationMs);

		let suspendedRole = interaction.guild!.roles.cache.find((r) => r.name === 'Suspended');
		if (!suspendedRole) {
			suspendedRole = await interaction.guild!.roles.create({
				name: 'Suspended',
				color: 0x808080,
				reason: 'Auto-created for suspension system',
			});
		}

		const roleIds = target.roles.cache.filter((r) => r.id !== interaction.guildId!).map((r) => r.id);

		const record = await prisma.suspendedUser.create({
			data: {
				userId: target.id,
				guildId: interaction.guildId!,
				roleIds,
				moderatorId: interaction.user.id,
				reason,
				expiresAt,
			},
		});

		await target.roles.set([suspendedRole], reason);
		scheduleSuspension(interaction.client, { ...record, expiresAt });

		const embed = buildModEmbed({
			action: 'Member Suspended',
			target: target.user,
			moderator: interaction.user,
			reason,
			duration: durationLabel,
			color: 0xff6961,
		});

		const altIds = await getLinkedAccounts(interaction.guildId!, target.id);
		let altCount = 0;

		for (const altId of altIds) {
			try {
				const altMember = await interaction.guild!.members.fetch(altId).catch(() => null);
				if (!altMember || !altMember.manageable) continue;

				const altExisting = await prisma.suspendedUser.findUnique({
					where: { userId_guildId: { userId: altId, guildId: interaction.guildId! } },
				});
				if (altExisting) continue;

				const altRoleIds = altMember.roles.cache.filter((r) => r.id !== interaction.guildId!).map((r) => r.id);
				const altRecord = await prisma.suspendedUser.create({
					data: {
						userId: altId,
						guildId: interaction.guildId!,
						roleIds: altRoleIds,
						moderatorId: interaction.user.id,
						reason: `[Alt of ${target.user.username}] ${reason}`,
						expiresAt,
					},
				});

				await altMember.roles.set([suspendedRole!], reason);
				scheduleSuspension(interaction.client, { ...altRecord, expiresAt });
				altCount++;

				const altEmbed = buildModEmbed({
					action: 'Member Suspended (Alt)',
					target: altMember.user,
					moderator: interaction.user,
					reason: `[Alt of ${target.user.username}] ${reason}`,
					duration: durationLabel,
					color: 0xff6961,
				});
				await Promise.all([sendModLog(interaction.guild!, altEmbed), sendPublicModLog(interaction.guild!, altEmbed)]);
			} catch {
				// skip alts that can't be suspended
			}
		}

		if (altCount > 0) embed.setFooter({ text: `Also applied to ${altCount} linked alt(s).` });

		await Promise.all([
			interaction.editReply({ embeds: [embed] }),
			sendModLog(interaction.guild!, embed),
			sendPublicModLog(interaction.guild!, embed),
		]);
	},
};

export default command;
