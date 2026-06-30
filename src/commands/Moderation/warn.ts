import {
	AutocompleteInteraction,
	SlashCommandBuilder,
	PermissionFlagsBits,
	ChatInputCommandInteraction,
	EmbedBuilder,
	GuildMember,
} from 'discord.js';
import type { Command } from '../../lib/types';
import { resolveReason, buildModEmbed, sendModLog, sendPublicModLog, sendPunishmentDM, getLinkedAccounts } from '../../lib/modUtils';
import { prisma } from '../../lib/prisma';
import { applyMcModAction } from '../../lib/mcRcon';

const WARN_BAN_THRESHOLD = 4;

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('warn')
		.setDescription('Manage member warnings.')
		.addSubcommand((sub) =>
			sub
				.setName('add')
				.setDescription('Issue a warning to a member.')
				.addUserOption((opt) => opt.setName('user').setDescription('Member to warn.').setRequired(true))
				.addStringOption((opt) =>
					opt.setName('reason').setDescription('Reason for the warning.').setRequired(true).setAutocomplete(true),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName('remove')
				.setDescription('Remove a warning by ID.')
				.addStringOption((opt) => opt.setName('id').setDescription('Warning ID to remove.').setRequired(true)),
		)
		.addSubcommand((sub) =>
			sub
				.setName('view')
				.setDescription('View warnings for a member, or look up a specific warning by ID.')
				.addUserOption((opt) => opt.setName('user').setDescription('Member to view warnings for.').setRequired(false))
				.addStringOption((opt) => opt.setName('id').setDescription('Specific warning ID to look up.').setRequired(false)),
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

	async autocomplete(interaction: AutocompleteInteraction) {
		const focused = interaction.options.getFocused();
		const aliases = await prisma.guildAlias.findMany({
			where: {
				guildId: interaction.guildId!,
				type: 'warn',
				name: { startsWith: focused, mode: 'insensitive' },
			},
			take: 25,
		});
		await interaction.respond(aliases.map((a) => ({ name: `${a.name} → ${a.value}`.slice(0, 100), value: a.name })));
	},

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const sub = interaction.options.getSubcommand();
		const guildId = interaction.guildId!;

		if (sub === 'add') {
			const targetUser = interaction.options.getUser('user', true);
			const rawReason = interaction.options.getString('reason', true);
			const member = await interaction.guild!.members.fetch(targetUser.id).catch(() => null);

			if (!member) {
				await interaction.editReply('That user is not in this server.');
				return;
			}

			const interactionMember = interaction.member as GuildMember;
			if (member.roles.highest.position >= interactionMember.roles.highest.position) {
				await interaction.editReply('You cannot warn someone with an equal or higher role.');
				return;
			}

			const reason = await resolveReason(guildId, 'warn', rawReason);

			const warning = await prisma.warning.create({
				data: { userId: targetUser.id, guildId, reason, moderatorId: interaction.user.id },
			});

			const warningCount = await prisma.warning.count({ where: { userId: targetUser.id, guildId, deletedAt: null } });

			const dmSent = await sendPunishmentDM(targetUser, {
				action: 'warn',
				guildName: interaction.guild!.name,
				reason,
				warningId: warning.id,
				warningsRemaining: Math.max(0, WARN_BAN_THRESHOLD - warningCount),
			});

			const embed = buildModEmbed({
				action: 'Member Warned',
				target: targetUser,
				moderator: interaction.user,
				reason,
				color: 0xffc067,
			});

			embed.addFields(
				{ name: 'Warning ID', value: `\`${warning.id}\``, inline: true },
				{ name: 'Total Warnings', value: `${warningCount}`, inline: true },
			);

			if (warningCount >= WARN_BAN_THRESHOLD) {
				const banReason =
					'This is an automated ban as you have received 4 or more warnings against your account. If you believe this is a mistake or you wish to appeal it, visit https://appeal.gg/2BtqX2ZhCg';
				await sendPunishmentDM(targetUser, {
					action: 'ban',
					guildName: interaction.guild!.name,
					reason: banReason,
					duration: 'Permanent',
				});
				await interaction.guild!.bans.create(targetUser.id, { reason: banReason }).catch(() => null);
				await applyMcModAction(guildId, targetUser.id, 'ban', banReason).catch(() => null);
				const banEmbed = buildModEmbed({
					action: 'Member Banned (Auto)',
					target: targetUser,
					moderator: interaction.guild!.client.user!,
					reason: banReason,
					duration: 'Permanent',
					color: 0xff6961,
				});
				await Promise.all([sendModLog(interaction.guild!, banEmbed), sendPublicModLog(interaction.guild!, banEmbed)]);
			}

			const altIds = await getLinkedAccounts(guildId, targetUser.id);
			let altCount = 0;

			for (const altId of altIds) {
				try {
					const altUser = await interaction.client.users.fetch(altId).catch(() => null);
					if (!altUser) continue;

					const altWarning = await prisma.warning.create({
						data: {
							userId: altId,
							guildId,
							reason: `[Alt of ${targetUser.username}] ${reason}`,
							moderatorId: interaction.user.id,
						},
					});
					const altWarnCount = await prisma.warning.count({ where: { userId: altId, guildId, deletedAt: null } });
					altCount++;

					const altWarnEmbed = buildModEmbed({
						action: 'Member Warned (Alt)',
						target: altUser,
						moderator: interaction.user,
						reason: `[Alt of ${targetUser.username}] ${reason}`,
						color: 0xffc067,
					});
					altWarnEmbed.addFields(
						{ name: 'Warning ID', value: `\`${altWarning.id}\``, inline: true },
						{ name: 'Total Warnings', value: `${altWarnCount}`, inline: true },
					);
					await Promise.all([sendModLog(interaction.guild!, altWarnEmbed), sendPublicModLog(interaction.guild!, altWarnEmbed)]);

					if (altWarnCount >= WARN_BAN_THRESHOLD) {
						const banReason =
							'This is an automated ban as you have received 4 or more warnings against your account. If you believe this is a mistake or you wish to appeal it, visit https://appeal.gg/2BtqX2ZhCg';
						await interaction.guild!.bans.create(altId, { reason: banReason }).catch(() => null);
						await applyMcModAction(guildId, altId, 'ban', banReason).catch(() => null);
						const altBanEmbed = buildModEmbed({
							action: 'Member Banned (Auto, Alt)',
							target: altUser,
							moderator: interaction.guild!.client.user!,
							reason: banReason,
							duration: 'Permanent',
							color: 0xff6961,
						});
						await Promise.all([sendModLog(interaction.guild!, altBanEmbed), sendPublicModLog(interaction.guild!, altBanEmbed)]);
					}
				} catch {
					// skip alts that can't be warned
				}
			}

			const notes: string[] = [];
			if (!dmSent) notes.push('Could not send DM to the user.');
			if (altCount > 0) notes.push(`Also applied to ${altCount} linked alt(s).`);
			if (notes.length) embed.setFooter({ text: notes.join(' ') });

			await Promise.all([sendModLog(interaction.guild!, embed), sendPublicModLog(interaction.guild!, embed)]);
			await interaction.editReply({ embeds: [embed] });
			return;
		}

		if (sub === 'remove') {
			const id = interaction.options.getString('id', true);
			const warning = await prisma.warning.findUnique({ where: { id } });

			if (!warning || warning.guildId !== guildId || warning.deletedAt) {
				await interaction.editReply('Warning not found.');
				return;
			}

			await prisma.warning.update({ where: { id }, data: { deletedAt: new Date() } });
			await interaction.editReply(`Warning \`${id}\` removed.`);
			return;
		}

		if (sub === 'view') {
			const targetUser = interaction.options.getUser('user');
			const warningId = interaction.options.getString('id');

			if (!targetUser && !warningId) {
				await interaction.editReply('Provide a user or a warning ID.');
				return;
			}

			if (warningId) {
				const warning = await prisma.warning.findUnique({ where: { id: warningId } });

				if (!warning || warning.guildId !== guildId) {
					await interaction.editReply('Warning not found.');
					return;
				}

				const embed = new EmbedBuilder()
					.setTitle(`Warning \`${warning.id}\``)
					.setColor(0xffc067)
					.addFields(
						{ name: 'User', value: `<@${warning.userId}>`, inline: true },
						{ name: 'Moderator', value: `<@${warning.moderatorId}>`, inline: true },
						{ name: 'Reason', value: warning.reason },
					)
					.setTimestamp(warning.createdAt);

				await interaction.editReply({ embeds: [embed] });
				return;
			}

			const warnings = await prisma.warning.findMany({
				where: { userId: targetUser!.id, guildId, deletedAt: null },
				orderBy: { createdAt: 'desc' },
				take: 25,
			});

			const total = await prisma.warning.count({ where: { userId: targetUser!.id, guildId, deletedAt: null } });

			const embed = new EmbedBuilder()
				.setTitle(`Warnings: ${targetUser!.username}`)
				.setColor(0xff6961)
				.setFooter({ text: `${total} total warning${total !== 1 ? 's' : ''}` })
				.setTimestamp();

			if (warnings.length === 0) {
				embed.setDescription('This member has no warnings.').setColor(0x77dd77);
			} else {
				for (const w of warnings) {
					embed.addFields({
						name: `\`${w.id}\``,
						value: `**Reason:** ${w.reason}\n**By:** <@${w.moderatorId}> · <t:${Math.floor(w.createdAt.getTime() / 1000)}:f>`,
					});
				}
			}

			await interaction.editReply({ embeds: [embed] });
		}
	},
};

export default command;
