import { AutocompleteInteraction, SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import type { Command } from '../../lib/types';
import { resolveReason } from '../../lib/modUtils';
import { prisma } from '../../lib/prisma';
import { checkModerationPermissions, applyPunishment } from '../../lib/moderationActions';

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('kick')
		.setDescription('Kick a member from the server.')
		.addUserOption((opt) => opt.setName('user').setDescription('Member to kick.').setRequired(true))
		.addStringOption((opt) => opt.setName('reason').setDescription('Reason for the kick.').setRequired(true).setAutocomplete(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

	async autocomplete(interaction: AutocompleteInteraction) {
		const focused = interaction.options.getFocused();
		const aliases = await prisma.guildAlias.findMany({
			where: {
				guildId: interaction.guildId!,
				type: 'kick',
				name: { startsWith: focused, mode: 'insensitive' },
			},
			take: 25,
		});
		await interaction.respond(aliases.map((a) => ({ name: `${a.name} → ${a.value}`.slice(0, 100), value: a.name })));
	},

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const targetUser = interaction.options.getUser('user', true);
		const rawReason = interaction.options.getString('reason', true);
		const member = await interaction.guild!.members.fetch(targetUser.id).catch(() => null);

		const moderatorMember = interaction.member as GuildMember;
		const permCheck = checkModerationPermissions({
			action: 'kick',
			guild: interaction.guild!,
			moderatorMember,
			target: member,
			targetUser,
		});
		if (!permCheck.ok) {
			await interaction.editReply(permCheck.message);
			return;
		}

		const reason = await resolveReason(interaction.guildId!, 'kick', rawReason);

		const result = await applyPunishment({
			action: 'kick',
			guild: interaction.guild!,
			targetUser,
			targetMember: member,
			moderator: { user: interaction.user, member: moderatorMember },
			reason,
		});

		if (!result.ok) {
			await interaction.editReply(result.failureMessage ?? 'Could not kick that member.');
			return;
		}

		await interaction.editReply({ embeds: [result.embed!] });
	},
};

export default command;
