import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../../lib/types';
import { prisma } from '../../lib/prisma';

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('view-config')
		.setDescription('View the current server configuration.')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const config = await prisma.guildConfig.findUnique({
			where: { guildId: interaction.guildId! },
		});

		const ch = (id: string) => `<#${id}>`;
		const ro = (id: string) => `<@&${id}>`;
		const none = (val: string) => `*${val}*`;

		const embed = new EmbedBuilder()
			.setTitle(`${interaction.guild!.name} Server Config`)
			.setColor(0xfd86f3)
			.addFields(
				{
					name: '📋 Log Channels',
					value: [
						`**Mod Log:** ${config?.modLogChannel ? ch(config.modLogChannel) : none('Not set')}`,
						`**Message Log:** ${config?.messageLogChannel ? ch(config.messageLogChannel) : none('Not set')}`,
						`**Member Log:** ${config?.memberLogChannel ? ch(config.memberLogChannel) : none('Not set')}`,
						`**Server Log:** ${config?.serverLogChannel ? ch(config.serverLogChannel) : none('Not set')}`,
						`**Voice Log:** ${config?.voiceLogChannel ? ch(config.voiceLogChannel) : none('Not set')}`,
						`**Public Mod Log:** ${config?.publicModLogChannel ? ch(config.publicModLogChannel) : none('Not set')}`,
					].join('\n'),
				},
				{
					name: '👋 Member Channels',
					value: [
						`**Welcome:** ${config?.welcomeChannel ? ch(config.welcomeChannel) : none('Not set')}`,
						`**Goodbye:** ${config?.goodbyeChannel ? ch(config.goodbyeChannel) : none('Not set')}`,
						`**Introductions:** ${config?.introChannel ? ch(config.introChannel) : none('Not set')}`,
						`**Leaderboard:** ${config?.leaderboardChannel ? ch(config.leaderboardChannel) : none('Not set')}`,
					].join('\n'),
				},
				{
					name: '⭐ XP Settings',
					value: [
						`**XP Enabled:** ${config?.xpEnabled === false ? '❌ Disabled' : '✅ Enabled'}`,
						`**No-XP Roles:** ${config?.noXpRoles.length ? config.noXpRoles.map(ro).join(', ') : none('None')}`,
						`**No-XP Channels:** ${config?.noXpChannels.length ? config.noXpChannels.map(ch).join(', ') : none('None')}`,
					].join('\n'),
				},
				{
					name: '💬 Forums',
					value: `**Managed Forums:** ${config?.forumChannels.length ? config.forumChannels.map(ch).join(', ') : none('None')}`,
				},
				{
					name: '🎭 Join Roles',
					value: `**Join Roles:** ${config?.joinRoles.length ? config.joinRoles.map(ro).join(', ') : none('None')}`,
				},
				{
					name: '🔁 Role Restore',
					value: `**Restore Roles on Rejoin:** ${config?.restoreRoles ? '✅ Enabled' : '❌ Disabled'}`,
				},
				{
					name: '🔒 Lockdown',
					value: `**Exempt Channels/Categories:** ${config?.lockdownExemptChannels.length ? config.lockdownExemptChannels.map(ch).join(', ') : none('None')}`,
				},
				{
					name: '🤖 AI Reports',
					value: `**AI Report Channel:** ${config?.aiReportChannel ? ch(config.aiReportChannel) : none('Not set')}`,
				},
			)
			.setTimestamp();

		await interaction.editReply({ embeds: [embed] });
	},
};

export default command;
