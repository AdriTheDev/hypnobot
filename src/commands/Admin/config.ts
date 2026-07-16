import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, ChannelType, EmbedBuilder, TextChannel } from 'discord.js';
import type { Command } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { updateLeaderboard } from '../../lib/leveling';
import { botBaitFooterText } from '../../lib/botBaitUtils';

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('config')
		.setDescription('Configure server settings.')
		.addSubcommandGroup((group) =>
			group
				.setName('no-xp-role')
				.setDescription('Manage roles that do not earn XP.')
				.addSubcommand((sub) =>
					sub
						.setName('add')
						.setDescription('Add a no-XP role.')
						.addRoleOption((opt) => opt.setName('role').setDescription('Role').setRequired(true)),
				)
				.addSubcommand((sub) =>
					sub
						.setName('remove')
						.setDescription('Remove a no-XP role.')
						.addRoleOption((opt) => opt.setName('role').setDescription('Role').setRequired(true)),
				),
		)
		.addSubcommandGroup((group) =>
			group
				.setName('no-xp-channel')
				.setDescription('Manage channels where XP is not earned.')
				.addSubcommand((sub) =>
					sub
						.setName('add')
						.setDescription('Add a no-XP channel.')
						.addChannelOption((opt) =>
							opt.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText).setRequired(true),
						),
				)
				.addSubcommand((sub) =>
					sub
						.setName('remove')
						.setDescription('Remove a no-XP channel.')
						.addChannelOption((opt) =>
							opt.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText).setRequired(true),
						),
				),
		)
		.addSubcommandGroup((group) =>
			group
				.setName('forum')
				.setDescription('Manage forum channels to clean up posts from when a member leaves.')
				.addSubcommand((sub) =>
					sub
						.setName('add')
						.setDescription('Add a forum channel.')
						.addChannelOption((opt) =>
							opt
								.setName('channel')
								.setDescription('Forum channel')
								.addChannelTypes(ChannelType.GuildForum)
								.setRequired(true),
						),
				)
				.addSubcommand((sub) =>
					sub
						.setName('remove')
						.setDescription('Remove a forum channel.')
						.addChannelOption((opt) =>
							opt
								.setName('channel')
								.setDescription('Forum channel')
								.addChannelTypes(ChannelType.GuildForum)
								.setRequired(true),
						),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName('mod-log')
				.setDescription('Set or clear the mod log channel.')
				.addChannelOption((opt) =>
					opt
						.setName('channel')
						.setDescription('Channel (omit to clear).')
						.addChannelTypes(ChannelType.GuildText)
						.setRequired(false),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName('welcome-channel')
				.setDescription('Set or clear the welcome channel.')
				.addChannelOption((opt) =>
					opt
						.setName('channel')
						.setDescription('Channel (omit to clear).')
						.addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
						.setRequired(false),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName('goodbye-channel')
				.setDescription('Set or clear the goodbye channel.')
				.addChannelOption((opt) =>
					opt
						.setName('channel')
						.setDescription('Channel (omit to clear).')
						.addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
						.setRequired(false),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName('welcome-message')
				.setDescription('Set or clear the custom welcome embed message. Omit to restore the default.')
				.addStringOption((opt) =>
					opt
						.setName('message')
						.setDescription('Template text. Placeholders: {username}, {@user}, {displayname}, {membercount}, {server}')
						.setRequired(false)
						.setMaxLength(1000),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName('goodbye-message')
				.setDescription('Set or clear the custom goodbye embed message. Omit to restore the default.')
				.addStringOption((opt) =>
					opt
						.setName('message')
						.setDescription('Template text. Placeholders: {username}, {displayname}, {membercount}, {server}')
						.setRequired(false)
						.setMaxLength(1000),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName('intro-channel')
				.setDescription('Set or clear the introduction channel. Posts here are deleted when a member leaves.')
				.addChannelOption((opt) =>
					opt
						.setName('channel')
						.setDescription('Channel (omit to clear). Can be a text or forum channel.')
						.addChannelTypes(ChannelType.GuildText, ChannelType.GuildForum)
						.setRequired(false),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName('message-log')
				.setDescription('Set or clear the channel for message delete/edit logs.')
				.addChannelOption((opt) =>
					opt
						.setName('channel')
						.setDescription('Channel (omit to clear).')
						.addChannelTypes(ChannelType.GuildText)
						.setRequired(false),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName('member-log')
				.setDescription('Set or clear the channel for member join/leave, nickname, and role change logs.')
				.addChannelOption((opt) =>
					opt
						.setName('channel')
						.setDescription('Channel (omit to clear).')
						.addChannelTypes(ChannelType.GuildText)
						.setRequired(false),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName('server-log')
				.setDescription('Set or clear the channel for server logs (channels, roles).')
				.addChannelOption((opt) =>
					opt
						.setName('channel')
						.setDescription('Channel (omit to clear).')
						.addChannelTypes(ChannelType.GuildText)
						.setRequired(false),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName('voice-log')
				.setDescription('Set or clear the channel for voice join/leave/switch logs.')
				.addChannelOption((opt) =>
					opt
						.setName('channel')
						.setDescription('Channel (omit to clear).')
						.addChannelTypes(ChannelType.GuildText)
						.setRequired(false),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName('public-mod-log')
				.setDescription('Set or clear the public moderation log channel (bans, kicks, mutes, warns).')
				.addChannelOption((opt) =>
					opt
						.setName('channel')
						.setDescription('Channel (omit to clear).')
						.addChannelTypes(ChannelType.GuildText)
						.setRequired(false),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName('leaderboard-channel')
				.setDescription('Set or clear the channel where the live leaderboard is posted.')
				.addChannelOption((opt) =>
					opt
						.setName('channel')
						.setDescription('Channel (omit to clear).')
						.addChannelTypes(ChannelType.GuildText)
						.setRequired(false),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName('ai-report-channel')
				.setDescription('Set or clear the channel where AI media reports are posted for moderator review.')
				.addChannelOption((opt) =>
					opt
						.setName('channel')
						.setDescription('Channel (omit to clear).')
						.addChannelTypes(ChannelType.GuildText)
						.setRequired(false),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName('bot-bait-channel')
				.setDescription('Set or clear the bot bait trap channel. Posting or reacting there triggers an automatic ban.')
				.addChannelOption((opt) =>
					opt
						.setName('channel')
						.setDescription('Channel (omit to clear).')
						.addChannelTypes(ChannelType.GuildText)
						.setRequired(false),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName('join-to-create')
				.setDescription('Set or clear the "Join to Create" trigger voice channel.')
				.addChannelOption((opt) =>
					opt
						.setName('channel')
						.setDescription('Voice channel members join to create their own VC (omit to clear).')
						.addChannelTypes(ChannelType.GuildVoice)
						.setRequired(false),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName('xp-enabled')
				.setDescription('Enable or disable XP gain for the server.')
				.addBooleanOption((opt) => opt.setName('enabled').setDescription('True to enable, false to disable.').setRequired(true)),
		)
		.addSubcommand((sub) =>
			sub
				.setName('restore-roles')
				.setDescription('Enable or disable restoring roles when a member rejoins.')
				.addBooleanOption((opt) => opt.setName('enabled').setDescription('True to enable, false to disable.').setRequired(true)),
		)
		.addSubcommandGroup((group) =>
			group
				.setName('join-role')
				.setDescription('Manage roles automatically assigned when a member joins.')
				.addSubcommand((sub) =>
					sub
						.setName('add')
						.setDescription('Add a join role.')
						.addRoleOption((opt) => opt.setName('role').setDescription('Role').setRequired(true)),
				)
				.addSubcommand((sub) =>
					sub
						.setName('remove')
						.setDescription('Remove a join role.')
						.addRoleOption((opt) => opt.setName('role').setDescription('Role').setRequired(true)),
				),
		)
		.addSubcommandGroup((group) =>
			group
				.setName('join-guard-role')
				.setDescription('Manage roles automatically assigned to new or suspicious joiners by JoinGuard.')
				.addSubcommand((sub) =>
					sub
						.setName('add')
						.setDescription('Add a JoinGuard role.')
						.addRoleOption((opt) => opt.setName('role').setDescription('Role').setRequired(true)),
				)
				.addSubcommand((sub) =>
					sub
						.setName('remove')
						.setDescription('Remove a JoinGuard role.')
						.addRoleOption((opt) => opt.setName('role').setDescription('Role').setRequired(true)),
				),
		)
		.addSubcommandGroup((group) =>
			group
				.setName('lockdown-exempt')
				.setDescription('Manage channels/categories that are skipped during server lockdown.')
				.addSubcommand((sub) =>
					sub
						.setName('add')
						.setDescription('Exempt a channel or category from lockdown.')
						.addChannelOption((opt) =>
							opt
								.setName('channel')
								.setDescription('Channel or category to exempt')
								.addChannelTypes(ChannelType.GuildText, ChannelType.GuildCategory, ChannelType.GuildAnnouncement)
								.setRequired(true),
						),
				)
				.addSubcommand((sub) =>
					sub
						.setName('remove')
						.setDescription('Remove a channel or category from lockdown exemptions.')
						.addChannelOption((opt) =>
							opt
								.setName('channel')
								.setDescription('Channel or category to remove')
								.addChannelTypes(ChannelType.GuildText, ChannelType.GuildCategory, ChannelType.GuildAnnouncement)
								.setRequired(true),
						),
				),
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const guildId = interaction.guildId!;
		const group = interaction.options.getSubcommandGroup();
		const sub = interaction.options.getSubcommand();

		if (group === 'no-xp-role') {
			const role = interaction.options.getRole('role', true);

			if (sub === 'add') {
				const current = await prisma.guildConfig.findUnique({ where: { guildId } });
				if (current?.noXpRoles.includes(role.id)) {
					await interaction.editReply(`${role} is already a no-XP role.`);
					return;
				}
				await prisma.guildConfig.upsert({
					where: { guildId },
					create: { guildId, noXpRoles: [role.id], noXpChannels: [] },
					update: { noXpRoles: { push: role.id } },
				});
				await interaction.editReply(`${role} added to no-XP roles.`);
			} else {
				const current = await prisma.guildConfig.findUnique({ where: { guildId } });
				if (!current?.noXpRoles.includes(role.id)) {
					await interaction.editReply(`${role} is not a no-XP role.`);
					return;
				}
				await prisma.guildConfig.update({
					where: { guildId },
					data: { noXpRoles: current.noXpRoles.filter((id) => id !== role.id) },
				});
				await interaction.editReply(`${role} removed from no-XP roles.`);
			}
			return;
		}

		if (group === 'no-xp-channel') {
			const channel = interaction.options.getChannel('channel', true);

			if (sub === 'add') {
				const current = await prisma.guildConfig.findUnique({ where: { guildId } });
				if (current?.noXpChannels.includes(channel.id)) {
					await interaction.editReply(`${channel} is already a no-XP channel.`);
					return;
				}
				await prisma.guildConfig.upsert({
					where: { guildId },
					create: { guildId, noXpRoles: [], noXpChannels: [channel.id] },
					update: { noXpChannels: { push: channel.id } },
				});
				await interaction.editReply(`${channel} added to no-XP channels.`);
			} else {
				const current = await prisma.guildConfig.findUnique({ where: { guildId } });
				if (!current?.noXpChannels.includes(channel.id)) {
					await interaction.editReply(`${channel} is not a no-XP channel.`);
					return;
				}
				await prisma.guildConfig.update({
					where: { guildId },
					data: { noXpChannels: current.noXpChannels.filter((id) => id !== channel.id) },
				});
				await interaction.editReply(`${channel} removed from no-XP channels.`);
			}
			return;
		}

		if (group === 'forum') {
			const channel = interaction.options.getChannel('channel', true);

			if (sub === 'add') {
				const current = await prisma.guildConfig.findUnique({ where: { guildId } });
				if (current?.forumChannels.includes(channel.id)) {
					await interaction.editReply(`${channel} is already a managed forum channel.`);
					return;
				}
				await prisma.guildConfig.upsert({
					where: { guildId },
					create: { guildId, noXpRoles: [], noXpChannels: [], forumChannels: [channel.id] },
					update: { forumChannels: { push: channel.id } },
				});
				await interaction.editReply(`${channel} added to managed forum channels.`);
			} else {
				const current = await prisma.guildConfig.findUnique({ where: { guildId } });
				if (!current?.forumChannels.includes(channel.id)) {
					await interaction.editReply(`${channel} is not a managed forum channel.`);
					return;
				}
				await prisma.guildConfig.update({
					where: { guildId },
					data: { forumChannels: current.forumChannels.filter((id) => id !== channel.id) },
				});
				await interaction.editReply(`${channel} removed from managed forum channels.`);
			}
			return;
		}

		if (sub === 'mod-log') {
			const channel = interaction.options.getChannel('channel');
			await prisma.guildConfig.upsert({
				where: { guildId },
				create: { guildId, noXpRoles: [], noXpChannels: [], modLogChannel: channel?.id ?? null },
				update: { modLogChannel: channel?.id ?? null },
			});
			await interaction.editReply(channel ? `Mod log set to ${channel}.` : 'Mod log channel cleared.');
			return;
		}

		if (sub === 'welcome-channel') {
			const channel = interaction.options.getChannel('channel');
			await prisma.guildConfig.upsert({
				where: { guildId },
				create: { guildId, noXpRoles: [], noXpChannels: [], welcomeChannel: channel?.id ?? null },
				update: { welcomeChannel: channel?.id ?? null },
			});
			await interaction.editReply(channel ? `Welcome channel set to ${channel}.` : 'Welcome channel cleared.');
			return;
		}

		if (sub === 'goodbye-channel') {
			const channel = interaction.options.getChannel('channel');
			await prisma.guildConfig.upsert({
				where: { guildId },
				create: { guildId, noXpRoles: [], noXpChannels: [], goodbyeChannel: channel?.id ?? null },
				update: { goodbyeChannel: channel?.id ?? null },
			});
			await interaction.editReply(channel ? `Goodbye channel set to ${channel}.` : 'Goodbye channel cleared.');
			return;
		}

		if (sub === 'welcome-message') {
			const message = interaction.options.getString('message');
			await prisma.guildConfig.upsert({
				where: { guildId },
				create: { guildId, noXpRoles: [], noXpChannels: [], welcomeMessage: message ?? null },
				update: { welcomeMessage: message ?? null },
			});
			await interaction.editReply(message ? `Welcome message set.` : 'Welcome message cleared (using default).');
			return;
		}

		if (sub === 'goodbye-message') {
			const message = interaction.options.getString('message');
			await prisma.guildConfig.upsert({
				where: { guildId },
				create: { guildId, noXpRoles: [], noXpChannels: [], goodbyeMessage: message ?? null },
				update: { goodbyeMessage: message ?? null },
			});
			await interaction.editReply(message ? `Goodbye message set.` : 'Goodbye message cleared (using default).');
			return;
		}

		if (sub === 'intro-channel') {
			const channel = interaction.options.getChannel('channel');
			await prisma.guildConfig.upsert({
				where: { guildId },
				create: { guildId, noXpRoles: [], noXpChannels: [], introChannel: channel?.id ?? null },
				update: { introChannel: channel?.id ?? null },
			});
			await interaction.editReply(channel ? `Introduction channel set to ${channel}.` : 'Introduction channel cleared.');
			return;
		}

		if (sub === 'message-log') {
			const channel = interaction.options.getChannel('channel');
			await prisma.guildConfig.upsert({
				where: { guildId },
				create: { guildId, noXpRoles: [], noXpChannels: [], messageLogChannel: channel?.id ?? null },
				update: { messageLogChannel: channel?.id ?? null },
			});
			await interaction.editReply(channel ? `Message log set to ${channel}.` : 'Message log channel cleared.');
			return;
		}

		if (sub === 'member-log') {
			const channel = interaction.options.getChannel('channel');
			await prisma.guildConfig.upsert({
				where: { guildId },
				create: { guildId, noXpRoles: [], noXpChannels: [], memberLogChannel: channel?.id ?? null },
				update: { memberLogChannel: channel?.id ?? null },
			});
			await interaction.editReply(channel ? `Member log set to ${channel}.` : 'Member log channel cleared.');
			return;
		}

		if (sub === 'server-log') {
			const channel = interaction.options.getChannel('channel');
			await prisma.guildConfig.upsert({
				where: { guildId },
				create: { guildId, noXpRoles: [], noXpChannels: [], serverLogChannel: channel?.id ?? null },
				update: { serverLogChannel: channel?.id ?? null },
			});
			await interaction.editReply(channel ? `Server log set to ${channel}.` : 'Server log channel cleared.');
			return;
		}

		if (sub === 'voice-log') {
			const channel = interaction.options.getChannel('channel');
			await prisma.guildConfig.upsert({
				where: { guildId },
				create: { guildId, noXpRoles: [], noXpChannels: [], voiceLogChannel: channel?.id ?? null },
				update: { voiceLogChannel: channel?.id ?? null },
			});
			await interaction.editReply(channel ? `Voice log set to ${channel}.` : 'Voice log channel cleared.');
			return;
		}

		if (sub === 'public-mod-log') {
			const channel = interaction.options.getChannel('channel');
			await prisma.guildConfig.upsert({
				where: { guildId },
				create: { guildId, noXpRoles: [], noXpChannels: [], publicModLogChannel: channel?.id ?? null },
				update: { publicModLogChannel: channel?.id ?? null },
			});
			await interaction.editReply(channel ? `Public mod log set to ${channel}.` : 'Public mod log channel cleared.');
			return;
		}

		if (group === 'join-role') {
			const role = interaction.options.getRole('role', true);

			if (sub === 'add') {
				const current = await prisma.guildConfig.findUnique({ where: { guildId } });
				if (current?.joinRoles.includes(role.id)) {
					await interaction.editReply(`${role} is already a join role.`);
					return;
				}
				await prisma.guildConfig.upsert({
					where: { guildId },
					create: { guildId, noXpRoles: [], noXpChannels: [], joinRoles: [role.id] },
					update: { joinRoles: { push: role.id } },
				});
				await interaction.editReply(`${role} added to join roles.`);
			} else {
				const current = await prisma.guildConfig.findUnique({ where: { guildId } });
				if (!current?.joinRoles.includes(role.id)) {
					await interaction.editReply(`${role} is not a join role.`);
					return;
				}
				await prisma.guildConfig.update({
					where: { guildId },
					data: { joinRoles: current.joinRoles.filter((id) => id !== role.id) },
				});
				await interaction.editReply(`${role} removed from join roles.`);
			}
			return;
		}

		if (group === 'join-guard-role') {
			const role = interaction.options.getRole('role', true);

			if (sub === 'add') {
				const current = await prisma.guildConfig.findUnique({ where: { guildId } });
				if (current?.joinGuardRoles.includes(role.id)) {
					await interaction.editReply(`${role} is already a JoinGuard role.`);
					return;
				}
				await prisma.guildConfig.upsert({
					where: { guildId },
					create: { guildId, noXpRoles: [], noXpChannels: [], joinGuardRoles: [role.id] },
					update: { joinGuardRoles: { push: role.id } },
				});
				await interaction.editReply(`${role} added to JoinGuard roles.`);
			} else {
				const current = await prisma.guildConfig.findUnique({ where: { guildId } });
				if (!current?.joinGuardRoles.includes(role.id)) {
					await interaction.editReply(`${role} is not a JoinGuard role.`);
					return;
				}
				await prisma.guildConfig.update({
					where: { guildId },
					data: { joinGuardRoles: current.joinGuardRoles.filter((id) => id !== role.id) },
				});
				await interaction.editReply(`${role} removed from JoinGuard roles.`);
			}
			return;
		}

		if (group === 'lockdown-exempt') {
			const channel = interaction.options.getChannel('channel', true);

			if (sub === 'add') {
				const current = await prisma.guildConfig.findUnique({ where: { guildId } });
				if (current?.lockdownExemptChannels.includes(channel.id)) {
					await interaction.editReply(`${channel} is already exempt from lockdown.`);
					return;
				}
				await prisma.guildConfig.upsert({
					where: { guildId },
					create: { guildId, noXpRoles: [], noXpChannels: [], lockdownExemptChannels: [channel.id] },
					update: { lockdownExemptChannels: { push: channel.id } },
				});
				await interaction.editReply(`${channel} added to lockdown exemptions.`);
			} else {
				const current = await prisma.guildConfig.findUnique({ where: { guildId } });
				if (!current?.lockdownExemptChannels.includes(channel.id)) {
					await interaction.editReply(`${channel} is not exempt from lockdown.`);
					return;
				}
				await prisma.guildConfig.update({
					where: { guildId },
					data: { lockdownExemptChannels: current.lockdownExemptChannels.filter((id) => id !== channel.id) },
				});
				await interaction.editReply(`${channel} removed from lockdown exemptions.`);
			}
			return;
		}

		if (sub === 'xp-enabled') {
			const enabled = interaction.options.getBoolean('enabled', true);
			await prisma.guildConfig.upsert({
				where: { guildId },
				create: { guildId, noXpRoles: [], noXpChannels: [], xpEnabled: enabled },
				update: { xpEnabled: enabled },
			});
			await interaction.editReply(enabled ? 'XP is now **enabled** for this server.' : 'XP is now **disabled** for this server.');
			return;
		}

		if (sub === 'restore-roles') {
			const enabled = interaction.options.getBoolean('enabled', true);
			await prisma.guildConfig.upsert({
				where: { guildId },
				create: { guildId, noXpRoles: [], noXpChannels: [], restoreRoles: enabled },
				update: { restoreRoles: enabled },
			});
			await interaction.editReply(
				enabled ? 'Role restore on rejoin is now **enabled**.' : 'Role restore on rejoin is now **disabled**.',
			);
			return;
		}

		if (sub === 'leaderboard-channel') {
			const channel = interaction.options.getChannel('channel');
			await prisma.guildConfig.upsert({
				where: { guildId },
				create: { guildId, noXpRoles: [], noXpChannels: [], leaderboardChannel: channel?.id ?? null, leaderboardMessageId: null },
				update: { leaderboardChannel: channel?.id ?? null, leaderboardMessageId: null },
			});

			if (channel) {
				await interaction.editReply(`Leaderboard channel set to ${channel}. Posting initial leaderboard...`);
				await updateLeaderboard(interaction.guild!);
				await interaction.editReply(`Leaderboard channel set to ${channel}.`);
			} else {
				await interaction.editReply('Leaderboard channel cleared.');
			}
		}

		if (sub === 'ai-report-channel') {
			const channel = interaction.options.getChannel('channel');
			await prisma.guildConfig.upsert({
				where: { guildId },
				create: { guildId, noXpRoles: [], noXpChannels: [], aiReportChannel: channel?.id ?? null },
				update: { aiReportChannel: channel?.id ?? null },
			});
			await interaction.editReply(channel ? `AI report channel set to ${channel}.` : 'AI report channel cleared.');
			return;
		}

		if (sub === 'bot-bait-channel') {
			const channel = interaction.options.getChannel('channel');
			const current = await prisma.guildConfig.findUnique({ where: { guildId } });

			if (current?.botBaitChannel && current.botBaitMessageId) {
				const oldChannel = interaction.guild!.channels.cache.get(current.botBaitChannel);
				if (oldChannel?.isTextBased()) {
					await (oldChannel as TextChannel).messages.delete(current.botBaitMessageId).catch(() => null);
				}
			}

			if (!channel) {
				await prisma.guildConfig.upsert({
					where: { guildId },
					create: { guildId, noXpRoles: [], noXpChannels: [], botBaitChannel: null, botBaitMessageId: null },
					update: { botBaitChannel: null, botBaitMessageId: null },
				});
				await interaction.editReply('Bot bait channel cleared.');
				return;
			}

			const embed = new EmbedBuilder()
				.setTitle('DO NOT POST IN THIS CHANNEL!')
				.setDescription(
					'Do not post in this channel or react to this message. Doing so will result in an automatic, permanent ban.',
				)
				.setColor(0xff6961)
				.setFooter({ text: botBaitFooterText(current?.botBaitBanCount ?? 0) });

			const sentMessage = await (channel as TextChannel).send({ embeds: [embed] });

			await prisma.guildConfig.upsert({
				where: { guildId },
				create: { guildId, noXpRoles: [], noXpChannels: [], botBaitChannel: channel.id, botBaitMessageId: sentMessage.id },
				update: { botBaitChannel: channel.id, botBaitMessageId: sentMessage.id },
			});
			await interaction.editReply(`Bot bait channel set to ${channel}. Warning message posted.`);
			return;
		}

		if (sub === 'join-to-create') {
			const channel = interaction.options.getChannel('channel');
			await prisma.guildConfig.upsert({
				where: { guildId },
				create: { guildId, noXpRoles: [], noXpChannels: [], joinToCreateChannel: channel?.id ?? null },
				update: { joinToCreateChannel: channel?.id ?? null },
			});
			await interaction.editReply(channel ? `Join-to-Create trigger set to ${channel}.` : 'Join-to-Create channel cleared.');
		}
	},
};

export default command;
