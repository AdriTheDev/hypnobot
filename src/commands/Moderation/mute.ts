import { AutocompleteInteraction, SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import type { Command } from '../../lib/types';
import { resolveReason } from '../../lib/modUtils';
import { prisma } from '../../lib/prisma';
import { checkModerationPermissions, applyPunishment } from '../../lib/moderationActions';
import ms, { StringValue } from 'ms';

const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('mute')
		.setDescription('Timeout a member, preventing them from sending messages.')
		.addUserOption((opt) => opt.setName('user').setDescription('Member to mute.').setRequired(true))
		.addStringOption((opt) => opt.setName('duration').setDescription('Duration (e.g. 10m, 1h, 7d). Max 28 days.').setRequired(true))
		.addStringOption((opt) => opt.setName('reason').setDescription('Reason for the mute.').setRequired(true).setAutocomplete(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

	async autocomplete(interaction: AutocompleteInteraction) {
		const focused = interaction.options.getFocused();
		const aliases = await prisma.guildAlias.findMany({
			where: {
				guildId: interaction.guildId!,
				type: 'mute',
				name: { startsWith: focused, mode: 'insensitive' },
			},
			take: 25,
		});
		await interaction.respond(aliases.map((a) => ({ name: `${a.name} → ${a.value}`.slice(0, 100), value: a.name })));
	},

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const targetUser = interaction.options.getUser('user', true);
		const durationStr = interaction.options.getString('duration', true);
		const rawReason = interaction.options.getString('reason', true);

		const member = await interaction.guild!.members.fetch(targetUser.id).catch(() => null);

		const moderatorMember = interaction.member as GuildMember;
		const permCheck = checkModerationPermissions({
			action: 'mute',
			guild: interaction.guild!,
			moderatorMember,
			target: member,
			targetUser,
		});
		if (!permCheck.ok) {
			await interaction.editReply(permCheck.message);
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

		const result = await applyPunishment({
			action: 'mute',
			guild: interaction.guild!,
			targetUser,
			targetMember: member,
			moderator: { user: interaction.user, member: moderatorMember },
			reason,
			durationMs,
		});

		if (!result.ok) {
			await interaction.editReply(result.failureMessage ?? 'Could not mute that member.');
			return;
		}

		await interaction.editReply({ embeds: [result.embed!] });
	},
};

export default command;
