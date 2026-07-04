import { AutocompleteInteraction, SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import type { Command } from '../../lib/types';
import { resolveReason } from '../../lib/modUtils';
import { prisma } from '../../lib/prisma';
import { checkModerationPermissions, applyPunishment } from '../../lib/moderationActions';
import ms, { StringValue } from 'ms';

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('ban')
		.setDescription('Ban a user from the server.')
		.addUserOption((opt) => opt.setName('user').setDescription('User to ban.').setRequired(true))
		.addStringOption((opt) => opt.setName('reason').setDescription('Reason for the ban.').setRequired(true).setAutocomplete(true))
		.addStringOption((opt) => opt.setName('duration').setDescription('Duration (e.g. 7d, 24h). Omit for permanent.').setRequired(false))
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

	async autocomplete(interaction: AutocompleteInteraction) {
		const focused = interaction.options.getFocused();
		const aliases = await prisma.guildAlias.findMany({
			where: {
				guildId: interaction.guildId!,
				type: 'ban',
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
		const durationStr = interaction.options.getString('duration');

		const member = await interaction.guild!.members.fetch(targetUser.id).catch(() => null);

		const moderatorMember = interaction.member as GuildMember;
		const permCheck = checkModerationPermissions({
			action: 'ban',
			guild: interaction.guild!,
			moderatorMember,
			target: member,
			targetUser,
		});
		if (!permCheck.ok) {
			await interaction.editReply(permCheck.message);
			return;
		}

		const reason = await resolveReason(interaction.guildId!, 'ban', rawReason);

		let durationMs: number | undefined;
		if (durationStr) {
			const parsed = ms(durationStr as StringValue);
			if (!parsed) {
				await interaction.editReply('Invalid duration format. Examples: `7d`, `24h`, `30m`.');
				return;
			}
			durationMs = parsed;
		}

		const result = await applyPunishment({
			action: 'ban',
			guild: interaction.guild!,
			targetUser,
			targetMember: member,
			moderator: { user: interaction.user, member: moderatorMember },
			reason,
			durationMs,
		});

		if (!result.ok) {
			await interaction.editReply(result.failureMessage ?? 'Could not ban that user.');
			return;
		}

		await interaction.editReply({ embeds: [result.embed!] });
	},
};

export default command;
