import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, TextChannel, ChannelType, EmbedBuilder } from 'discord.js';
import type { Command } from '../../lib/types';
import ms, { StringValue } from 'ms';

const DISABLE_KEYWORDS = new Set(['off', 'none', 'disable', '0', 'reset']);
const MAX_SLOWMODE_S = 21600;

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('slowmode')
		.setDescription('Set or view the slowmode for a channel.')
		.addStringOption((opt) => opt.setName('duration').setDescription('Duration (e.g. 30s, 5m) or "off" to disable.').setRequired(false))
		.addChannelOption((opt) =>
			opt
				.setName('channel')
				.setDescription('Channel to modify (defaults to current).')
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(false),
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const durationStr = interaction.options.getString('duration');
		const channel = (interaction.options.getChannel('channel') ?? interaction.channel) as TextChannel;

		if (!durationStr) {
			const current = channel.rateLimitPerUser;
			await interaction.editReply(`Current slowmode in ${channel}: **${current ? `${current}s` : 'off'}**.`);
			return;
		}

		let seconds: number;

		if (DISABLE_KEYWORDS.has(durationStr.toLowerCase())) {
			seconds = 0;
		} else {
			const duration = ms(durationStr as StringValue);
			if (!duration) {
				await interaction.editReply('Invalid duration format. Examples: `30s`, `5m`, or `off` to disable.');
				return;
			}
			seconds = Math.floor(duration / 1000);
			if (seconds > MAX_SLOWMODE_S) {
				await interaction.editReply('Slowmode cannot exceed 6 hours (21600 seconds).');
				return;
			}
		}

		await channel.setRateLimitPerUser(seconds, `Set by ${interaction.user.tag}`);

		const channelEmbed = new EmbedBuilder()
			.setTitle('Slowmode Updated')
			.setDescription(`Slowmode for ${channel} is now **${seconds ? `${seconds}s` : 'off'}**.`)
			.setColor(0xffc067);

		await interaction.editReply({ embeds: [channelEmbed] });
		channel.send({ embeds: [channelEmbed] });
	},
};

export default command;
