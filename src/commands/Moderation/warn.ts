import {
	AutocompleteInteraction,
	SlashCommandBuilder,
	PermissionFlagsBits,
	ChatInputCommandInteraction,
	EmbedBuilder,
	GuildMember,
} from 'discord.js';
import type { Command } from '../../lib/types';
import { resolveReason } from '../../lib/modUtils';
import { prisma } from '../../lib/prisma';
import { checkModerationPermissions, applyPunishment } from '../../lib/moderationActions';

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

			const moderatorMember = interaction.member as GuildMember;
			const permCheck = checkModerationPermissions({
				action: 'warn',
				guild: interaction.guild!,
				moderatorMember,
				target: member,
				targetUser,
			});
			if (!permCheck.ok) {
				await interaction.editReply(permCheck.message);
				return;
			}

			const reason = await resolveReason(guildId, 'warn', rawReason);

			const result = await applyPunishment({
				action: 'warn',
				guild: interaction.guild!,
				targetUser,
				targetMember: member,
				moderator: { user: interaction.user, member: moderatorMember },
				reason,
			});

			if (!result.ok) {
				await interaction.editReply(result.failureMessage ?? 'Could not warn that member.');
				return;
			}

			await interaction.editReply({ embeds: [result.embed!] });
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
