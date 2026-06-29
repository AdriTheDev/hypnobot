import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import {
	AUTOMOD_THRESHOLD,
	DEFAULT_AVATAR_POINTS,
	NEW_ACCOUNT_DAYS,
	NEW_ACCOUNT_POINTS,
	SUSPICIOUS_USERNAME_POINTS,
	NON_ASCII_DISPLAY_NAME_POINTS,
} from '../../lib/automodUtils';

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('automod')
		.setDescription('Configure the automatic moderation points system.')
		.addSubcommand((sub) => sub.setName('list').setDescription('View the current automod configuration.'))
		.addSubcommandGroup((group) =>
			group
				.setName('role')
				.setDescription('Manage role risk factors.')
				.addSubcommand((sub) =>
					sub
						.setName('add')
						.setDescription('Assign points to members who hold a specific role.')
						.addRoleOption((opt) => opt.setName('role').setDescription('Role to flag.').setRequired(true))
						.addIntegerOption((opt) =>
							opt.setName('points').setDescription('Points this role adds.').setMinValue(1).setRequired(true),
						),
				)
				.addSubcommand((sub) =>
					sub
						.setName('remove')
						.setDescription('Remove a role risk factor.')
						.addRoleOption((opt) => opt.setName('role').setDescription('Role to remove.').setRequired(true)),
				),
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const guildId = interaction.guildId!;
		const group = interaction.options.getSubcommandGroup();
		const sub = interaction.options.getSubcommand();

		if (sub === 'list') {
			const roleFactors = await prisma.automodFactor.findMany({ where: { guildId } });

			const staticLines = [
				`No profile picture: **${DEFAULT_AVATAR_POINTS}** pt${DEFAULT_AVATAR_POINTS !== 1 ? 's' : ''}`,
				`Account < ${NEW_ACCOUNT_DAYS} days old: **${NEW_ACCOUNT_POINTS}** pt${NEW_ACCOUNT_POINTS !== 1 ? 's' : ''}`,
				`Suspicious username (word.word.1234): **${SUSPICIOUS_USERNAME_POINTS}** pt${SUSPICIOUS_USERNAME_POINTS !== 1 ? 's' : ''}`,
				`Non-ASCII display name: **${NON_ASCII_DISPLAY_NAME_POINTS}** pt${NON_ASCII_DISPLAY_NAME_POINTS !== 1 ? 's' : ''}`,
			];

			const roleLines =
				roleFactors.length > 0
					? roleFactors.map((f) => `<@&${f.value}>: **${f.points}** pt${f.points !== 1 ? 's' : ''}`)
					: ['*None configured.*'];

			const embed = new EmbedBuilder()
				.setTitle('Automod Configuration')
				.setColor(0xfd86f3)
				.addFields(
					{ name: 'Suspension Threshold', value: `**${AUTOMOD_THRESHOLD}** points` },
					{ name: 'Built-in Factors', value: staticLines.join('\n') },
					{ name: 'Role Factors', value: roleLines.join('\n') },
				)
				.setTimestamp();

			await interaction.editReply({ embeds: [embed] });
			return;
		}

		if (group === 'role') {
			if (sub === 'add') {
				const role = interaction.options.getRole('role', true);
				const points = interaction.options.getInteger('points', true);
				await prisma.automodFactor.upsert({
					where: { guildId_type_value: { guildId, type: 'role', value: role.id } },
					create: { guildId, type: 'role', value: role.id, points },
					update: { points },
				});
				await interaction.editReply(`${role} now adds **${points}** point${points !== 1 ? 's' : ''} to a member's risk score.`);
				return;
			}

			if (sub === 'remove') {
				const role = interaction.options.getRole('role', true);
				const deleted = await prisma.automodFactor.deleteMany({ where: { guildId, type: 'role', value: role.id } });
				await interaction.editReply(deleted.count === 0 ? `${role} is not a risk factor.` : `${role} removed from risk factors.`);
				return;
			}
		}
	},
};

export default command;
