import { AutocompleteInteraction, SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import type { Command } from '../../lib/types';
import { resolveReason, buildModEmbed, sendModLog, sendPublicModLog, sendPunishmentDM, getLinkedAccounts } from '../../lib/modUtils';
import { prisma } from '../../lib/prisma';
import { scheduleTempBan } from '../../lib/tempBanScheduler';
import { applyMcModAction } from '../../lib/mcRcon';
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
			deleteMessageSeconds: 7 * 86400,
		});

		if (durationMs) {
			const expiresAt = new Date(Date.now() + durationMs);
			const ban = await prisma.tempBan.upsert({
				where: { userId_guildId: { userId: targetUser.id, guildId: interaction.guildId! } },
				create: { userId: targetUser.id, guildId: interaction.guildId!, reason, moderatorId: interaction.user.id, expiresAt },
				update: { reason, moderatorId: interaction.user.id, expiresAt },
			});
			scheduleTempBan(interaction.client, ban);
		}

		let mcBanned: string | null = null;
		let mcReachable = true;
		try {
			mcBanned = await applyMcModAction(interaction.guildId!, targetUser.id, 'ban', reason);
		} catch {
			mcReachable = false;
		}

		const embed = buildModEmbed({
			action: 'Member Banned',
			target: targetUser,
			moderator: interaction.user,
			reason,
			duration: durationLabel ?? 'Permanent',
			color: 0xff6961,
		});

		const altIds = await getLinkedAccounts(interaction.guildId!, targetUser.id);
		let altCount = 0;

		for (const altId of altIds) {
			try {
				await interaction.guild!.bans.create(altId, {
					reason: `[Alt of ${targetUser.username}] ${reason}`,
					deleteMessageSeconds: 7 * 86400,
				});
				altCount++;

				if (durationMs) {
					const altExpiresAt = new Date(Date.now() + durationMs);
					const altBan = await prisma.tempBan.upsert({
						where: { userId_guildId: { userId: altId, guildId: interaction.guildId! } },
						create: {
							userId: altId,
							guildId: interaction.guildId!,
							reason,
							moderatorId: interaction.user.id,
							expiresAt: altExpiresAt,
						},
						update: { reason, moderatorId: interaction.user.id, expiresAt: altExpiresAt },
					});
					scheduleTempBan(interaction.client, altBan);
				}

				await applyMcModAction(interaction.guildId!, altId, 'ban', `[Alt of ${targetUser.username}] ${reason}`).catch(() => null);

				const altUser = await interaction.client.users.fetch(altId).catch(() => null);
				if (altUser) {
					const altEmbed = buildModEmbed({
						action: 'Member Banned (Alt)',
						target: altUser,
						moderator: interaction.user,
						reason: `[Alt of ${targetUser.username}] ${reason}`,
						duration: durationLabel ?? 'Permanent',
						color: 0xff6961,
					});
					await Promise.all([sendModLog(interaction.guild!, altEmbed), sendPublicModLog(interaction.guild!, altEmbed)]);
				}
			} catch {
				// alt may already be banned or otherwise unbannable
			}
		}

		const notes: string[] = [];
		if (!dmSent) notes.push('Could not send DM to the user.');
		if (altCount > 0) notes.push(`Also applied to ${altCount} linked alt(s).`);
		if (mcBanned) notes.push(`Also banned from Minecraft as \`${mcBanned}\`.`);
		if (!mcReachable) notes.push('Could not reach the Minecraft server.');
		if (notes.length) embed.setFooter({ text: notes.join(' ') });

		await Promise.all([sendModLog(interaction.guild!, embed), sendPublicModLog(interaction.guild!, embed)]);
		await interaction.editReply({ embeds: [embed] });
	},
};

export default command;
