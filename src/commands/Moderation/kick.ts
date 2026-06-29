import { AutocompleteInteraction, SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import type { Command } from '../../lib/types';
import { resolveReason, buildModEmbed, sendModLog, sendPublicModLog, sendPunishmentDM, getLinkedAccounts } from '../../lib/modUtils';
import { prisma } from '../../lib/prisma';

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

		if (!member) {
			await interaction.editReply('That user is not in this server.');
			return;
		}

		if (!member.kickable) {
			await interaction.editReply('I do not have permission to kick that member.');
			return;
		}

		const interactionMember = interaction.member as GuildMember;
		if (member.roles.highest.position >= interactionMember.roles.highest.position) {
			await interaction.editReply('You cannot kick someone with an equal or higher role.');
			return;
		}

		const reason = await resolveReason(interaction.guildId!, 'kick', rawReason);

		const dmSent = await sendPunishmentDM(targetUser, {
			action: 'kick',
			guildName: interaction.guild!.name,
			reason,
		});

		await member.kick(reason);

		const embed = buildModEmbed({
			action: 'Member Kicked',
			target: targetUser,
			moderator: interaction.user,
			reason,
			color: 0xff6961,
		});

		const altIds = await getLinkedAccounts(interaction.guildId!, targetUser.id);
		let altCount = 0;

		for (const altId of altIds) {
			try {
				const altMember = await interaction.guild!.members.fetch(altId).catch(() => null);
				if (!altMember || !altMember.kickable) continue;

				await altMember.kick(`[Alt of ${targetUser.username}] ${reason}`);
				altCount++;

				const altEmbed = buildModEmbed({
					action: 'Member Kicked (Alt)',
					target: altMember.user,
					moderator: interaction.user,
					reason: `[Alt of ${targetUser.username}] ${reason}`,
					color: 0xff6961,
				});
				await Promise.all([sendModLog(interaction.guild!, altEmbed), sendPublicModLog(interaction.guild!, altEmbed)]);
			} catch {
				// skip alts that can't be kicked
			}
		}

		const notes: string[] = [];
		if (!dmSent) notes.push('Could not send DM to the user.');
		if (altCount > 0) notes.push(`Also applied to ${altCount} linked alt(s).`);
		if (notes.length) embed.setFooter({ text: notes.join(' ') });

		await Promise.all([sendModLog(interaction.guild!, embed), sendPublicModLog(interaction.guild!, embed)]);
		await interaction.editReply({ embeds: [embed] });
	},
};

export default command;
