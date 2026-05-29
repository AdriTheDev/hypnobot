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

		const modLog = config?.modLogChannel ? `<#${config.modLogChannel}>` : 'Not set';
		const welcome = config?.welcomeChannel ? `<#${config.welcomeChannel}>` : 'Not set';
		const goodbye = config?.goodbyeChannel ? `<#${config.goodbyeChannel}>` : 'Not set';
		const intro = config?.introChannel ? `<#${config.introChannel}>` : 'Not set';
		const forums = config?.forumChannels.length ? config.forumChannels.map((id) => `<#${id}>`).join(', ') : 'None';
		const noXpRoles = config?.noXpRoles.length ? config.noXpRoles.map((id) => `<@&${id}>`).join(', ') : 'None';
		const noXpChannels = config?.noXpChannels.length ? config.noXpChannels.map((id) => `<#${id}>`).join(', ') : 'None';

		const embed = new EmbedBuilder()
			.setTitle(`${interaction.guild!.name} Server Config`)
			.setColor(0xfd86f3)
			.addFields(
				{ name: 'Mod Log Channel', value: modLog, inline: true },
				{ name: 'Welcome Channel', value: welcome, inline: true },
				{ name: 'Goodbye Channel', value: goodbye, inline: true },
				{ name: 'Introduction Channel', value: intro, inline: true },
				{ name: 'Managed Forums', value: forums },
				{ name: 'No XP Roles', value: noXpRoles },
				{ name: 'No XP Channels', value: noXpChannels },
			)
			.setTimestamp();

		await interaction.editReply({ embeds: [embed] });
	},
};

export default command;
