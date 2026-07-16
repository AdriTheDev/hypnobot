import {
	SlashCommandBuilder,
	PermissionFlagsBits,
	ChatInputCommandInteraction,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
} from 'discord.js';
import type { Command } from '../../lib/types';
import { prisma } from '../../lib/prisma';

type GuildConfigRecord = Awaited<ReturnType<typeof prisma.guildConfig.findUnique>>;

const ch = (id: string) => `<#${id}>`;
const ro = (id: string) => `<@&${id}>`;
const none = (val: string) => `*${val}*`;

function buildPages(config: GuildConfigRecord, guildName: string): EmbedBuilder[] {
	const base = () => new EmbedBuilder().setTitle(`${guildName} Server Config`).setColor(0xfd86f3).setTimestamp();

	const logging = base().addFields({
		name: '📋 Log Channels',
		value: [
			`**Mod Log:** ${config?.modLogChannel ? ch(config.modLogChannel) : none('Not set')}`,
			`**Message Log:** ${config?.messageLogChannel ? ch(config.messageLogChannel) : none('Not set')}`,
			`**Member Log:** ${config?.memberLogChannel ? ch(config.memberLogChannel) : none('Not set')}`,
			`**Server Log:** ${config?.serverLogChannel ? ch(config.serverLogChannel) : none('Not set')}`,
			`**Voice Log:** ${config?.voiceLogChannel ? ch(config.voiceLogChannel) : none('Not set')}`,
			`**Public Mod Log:** ${config?.publicModLogChannel ? ch(config.publicModLogChannel) : none('Not set')}`,
		].join('\n'),
	});

	const members = base().addFields(
		{
			name: '👋 Member Channels',
			value: [
				`**Welcome:** ${config?.welcomeChannel ? ch(config.welcomeChannel) : none('Not set')}`,
				`**Welcome Message:** ${config?.welcomeMessage ? `\`${config.welcomeMessage}\`` : none('Default')}`,
				`**Goodbye:** ${config?.goodbyeChannel ? ch(config.goodbyeChannel) : none('Not set')}`,
				`**Goodbye Message:** ${config?.goodbyeMessage ? `\`${config.goodbyeMessage}\`` : none('Default')}`,
				`**Introductions:** ${config?.introChannel ? ch(config.introChannel) : none('Not set')}`,
				`**Leaderboard:** ${config?.leaderboardChannel ? ch(config.leaderboardChannel) : none('Not set')}`,
			].join('\n'),
		},
		{
			name: '🎭 Join Roles',
			value: `**Join Roles:** ${config?.joinRoles.length ? config.joinRoles.map(ro).join(', ') : none('None')}`,
		},
		{
			name: '🛡️ JoinGuard',
			value: `**JoinGuard Roles:** ${config?.joinGuardRoles.length ? config.joinGuardRoles.map(ro).join(', ') : none('None')}`,
		},
		{
			name: '🔁 Role Restore',
			value: `**Restore Roles on Rejoin:** ${config?.restoreRoles ? '✅ Enabled' : '❌ Disabled'}`,
		},
	);

	const other = base().addFields(
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
			name: '🔒 Lockdown',
			value: `**Exempt Channels/Categories:** ${config?.lockdownExemptChannels.length ? config.lockdownExemptChannels.map(ch).join(', ') : none('None')}`,
		},
		{
			name: '🤖 AI Reports',
			value: `**AI Report Channel:** ${config?.aiReportChannel ? ch(config.aiReportChannel) : none('Not set')}`,
		},
		{
			name: '🎙️ Voice',
			value: `**Join-to-Create Channel:** ${config?.joinToCreateChannel ? ch(config.joinToCreateChannel) : none('Not set')}`,
		},
		{
			name: '🪤 Bot Bait',
			value: [
				`**Trap Channel:** ${config?.botBaitChannel ? ch(config.botBaitChannel) : none('Not set')}`,
				`**Bots Baited:** ${config?.botBaitBanCount ?? 0}`,
			].join('\n'),
		},
	);

	const pages = [logging, members, other];
	pages.forEach((embed, i) => embed.setFooter({ text: `Page ${i + 1}/${pages.length}` }));
	return pages;
}

function buildRow(page: number, total: number): ActionRowBuilder<ButtonBuilder> {
	return new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder().setCustomId('config_prev').setLabel('◀ Previous').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
		new ButtonBuilder().setCustomId('config_next').setLabel('Next ▶').setStyle(ButtonStyle.Secondary).setDisabled(page === total - 1),
	);
}

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

		const pages = buildPages(config, interaction.guild!.name);
		let page = 0;

		const message = await interaction.editReply({ embeds: [pages[page]], components: [buildRow(page, pages.length)] });

		const collector = message.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 120_000,
		});

		collector.on('collect', async (button) => {
			if (button.user.id !== interaction.user.id) {
				await button.reply({ content: 'Only the person who ran this command can change pages.', ephemeral: true });
				return;
			}

			if (button.customId === 'config_prev') page = Math.max(0, page - 1);
			if (button.customId === 'config_next') page = Math.min(pages.length - 1, page + 1);

			await button.update({ embeds: [pages[page]], components: [buildRow(page, pages.length)] });
		});

		collector.on('end', async () => {
			await interaction.editReply({ components: [] }).catch(() => null);
		});
	},
};

export default command;
