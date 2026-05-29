import { SlashCommandBuilder, EmbedBuilder, Colors, ChatInputCommandInteraction, ChannelType, version as djsVersion } from 'discord.js';
import { prisma } from '../../lib/prisma';
import { resolveLevel } from '../../lib/levelingUtils';
import type { Command, ExtendedClient } from '../../lib/types';

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('info')
		.setDescription('Display information about the bot, a user, or the server.')
		.addSubcommand((sub) => sub.setName('bot').setDescription('Show bot information.'))
		.addSubcommand((sub) =>
			sub
				.setName('user')
				.setDescription('Show information about a user.')
				.addUserOption((opt) => opt.setName('user').setDescription('User to inspect (defaults to you).').setRequired(false)),
		)
		.addSubcommand((sub) => sub.setName('server').setDescription('Show server information.')),

	async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
		const sub = interaction.options.getSubcommand();

		if (sub === 'bot') {
			await interaction.deferReply();

			const totalMembers = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);

			const embed = new EmbedBuilder()
				.setColor(0xfd86f3)
				.setAuthor({
					name: client.user!.username,
					iconURL: client.user!.displayAvatarURL(),
				})
				.setThumbnail(client.user!.displayAvatarURL({ size: 256 }))
				.addFields(
					{
						name: 'Uptime',
						value: `<t:${Math.floor((Date.now() - client.uptime!) / 1000)}:R>`,
						inline: true,
					},
					{
						name: 'Ping',
						value: `\`${client.ws.ping}ms\``,
						inline: true,
					},
					{
						name: 'Servers',
						value: `\`${client.guilds.cache.size}\``,
						inline: true,
					},
					{
						name: 'Members',
						value: `\`${totalMembers.toLocaleString()}\``,
						inline: true,
					},
					{
						name: 'Commands',
						value: `\`${client.commands.size}\``,
						inline: true,
					},
					{ name: 'Node.js', value: `\`${process.version}\``, inline: true },
					{
						name: 'Discord.js',
						value: `\`v${djsVersion}\``,
						inline: true,
					},
				)
				.setTimestamp();

			await interaction.editReply({ embeds: [embed] });
			return;
		}

		if (sub === 'user') {
			await interaction.deferReply();

			const target = interaction.options.getUser('user') ?? interaction.user;
			const [member, levelRecord] = await Promise.all([
				interaction.guild!.members.fetch(target.id).catch(() => null),
				prisma.userLevel.findUnique({
					where: { userId_guildId: { userId: target.id, guildId: interaction.guildId! } },
				}),
			]);

			const embed = new EmbedBuilder()
				.setColor(member?.displayHexColor && member.displayHexColor !== '#000000' ? member.displayHexColor : 0xfd86f3)
				.setAuthor({
					name: target.username,
					iconURL: target.displayAvatarURL(),
				})
				.setThumbnail(target.displayAvatarURL({ size: 256 }))
				.addFields(
					{ name: 'ID', value: `\`${target.id}\``, inline: true },
					{
						name: 'Bot',
						value: `\`${target.bot ? 'Yes' : 'No'}\``,
						inline: true,
					},
					{
						name: 'Created',
						value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`,
						inline: true,
					},
				)
				.setTimestamp();

			if (member) {
				const roles = member.roles.cache
					.filter((r) => r.id !== interaction.guildId)
					.sort((a, b) => b.position - a.position)
					.map((r) => `${r}`)
					.slice(0, 10);

				embed.addFields(
					{
						name: 'Display Name',
						value: member.displayName,
						inline: true,
					},
					{
						name: 'Joined Server',
						value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown',
						inline: true,
					},
					{
						name: 'Highest Role',
						value: `${member.roles.highest}`,
						inline: true,
					},
					{
						name: `Roles (${member.roles.cache.size - 1})`,
						value: roles.length ? roles.join(' ') : 'None',
					},
				);
			}

			if (levelRecord) {
				const { level, currentLevelXP, requiredXP } = resolveLevel(levelRecord.xp);
				embed.addFields(
					{ name: 'Level', value: `\`${level}\``, inline: true },
					{ name: 'XP', value: `\`${currentLevelXP} / ${requiredXP}\``, inline: true },
					{ name: 'Messages', value: `\`${levelRecord.messages.toLocaleString()}\``, inline: true },
				);
			}

			await interaction.editReply({ embeds: [embed] });
			return;
		}

		if (sub === 'server') {
			await interaction.deferReply();

			const guild = interaction.guild!;
			const owner = await guild.fetchOwner().catch(() => null);

			const embed = new EmbedBuilder()
				.setColor(0xfd86f3)
				.setAuthor({
					name: guild.name,
					iconURL: guild.iconURL() ?? undefined,
				})
				.setThumbnail(guild.iconURL({ size: 256 }) ?? null)
				.addFields(
					{ name: 'ID', value: `\`${guild.id}\``, inline: true },
					{
						name: 'Owner',
						value: `${owner ? `${owner}` : 'Unknown'}`,
						inline: true,
					},
					{
						name: 'Created',
						value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
						inline: true,
					},
					{
						name: 'Members',
						value: `\`${guild.memberCount.toLocaleString()}\``,
						inline: true,
					},
					{
						name: 'Roles',
						value: `\`${guild.roles.cache.size}\``,
						inline: true,
					},
					{
						name: 'Emojis',
						value: `\`${guild.emojis.cache.size}\``,
						inline: true,
					},
				)
				.setTimestamp();

			if (guild.bannerURL()) embed.setImage(guild.bannerURL({ size: 1024 }));

			await interaction.editReply({ embeds: [embed] });
		}
	},
};

export default command;
