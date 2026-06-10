import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, ChannelType } from 'discord.js';
import type { Command } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { updateLeaderboard } from '../../lib/leaderboard';

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
	},
};

export default command;
