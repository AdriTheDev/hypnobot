import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { rconCommand, fetchMojangProfile } from '../../lib/mcRcon';

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('whitelist')
		.setDescription('Manage Minecraft server whitelist.')
		.addSubcommand((sub) =>
			sub
				.setName('add')
				.setDescription('Whitelist your Minecraft account on the server.')
				.addStringOption((opt) =>
					opt
						.setName('username')
						.setDescription('Your Minecraft Java Edition username.')
						.setRequired(true)
						.setMinLength(3)
						.setMaxLength(16),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName('remove')
				.setDescription("Remove a member's Minecraft whitelist entry.")
				.addUserOption((opt) => opt.setName('user').setDescription('Member to remove from the whitelist.').setRequired(true)),
		)
		.addSubcommand((sub) => sub.setName('list').setDescription('Show all whitelisted Minecraft accounts in this server.')),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const sub = interaction.options.getSubcommand();
		const guildId = interaction.guildId!;

		if (sub === 'add') {
			const username = interaction.options.getString('username', true).trim();

			const existing = await prisma.minecraftWhitelist.findUnique({
				where: { userId_guildId: { userId: interaction.user.id, guildId } },
			});
			if (existing) {
				await interaction.editReply(
					`You already have a whitelisted account: \`${existing.minecraftUsername}\`. Ask a moderator to remove it first if you need to change it.`,
				);
				return;
			}

			const profile = await fetchMojangProfile(username).catch(() => null);
			if (!profile) {
				await interaction.editReply(
					`No Minecraft Java Edition account found for \`${username}\`. Check the spelling and try again.`,
				);
				return;
			}

			const taken = await prisma.minecraftWhitelist.findUnique({
				where: { guildId_minecraftUsername: { guildId, minecraftUsername: profile.name } },
			});
			if (taken) {
				await interaction.editReply(`\`${profile.name}\` is already linked to another Discord account in this server.`);
				return;
			}

			try {
				await rconCommand(`whitelist add ${profile.name}`);
			} catch {
				await interaction.editReply('Could not reach the Minecraft server. Please try again later or contact an admin.');
				return;
			}

			await prisma.minecraftWhitelist.create({
				data: {
					userId: interaction.user.id,
					guildId,
					minecraftUsername: profile.name,
					minecraftUuid: profile.id,
				},
			});

			const embed = new EmbedBuilder()
				.setTitle('Whitelisted')
				.setDescription(`\`${profile.name}\` has been added to the Minecraft server whitelist.`)
				.setColor(0x77dd77)
				.setThumbnail(`https://mc-heads.net/avatar/${profile.id}/64`)
				.setTimestamp();

			await interaction.editReply({ embeds: [embed] });
			return;
		}

		if (sub === 'remove') {
			if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
				await interaction.editReply('You do not have permission to remove whitelist entries.');
				return;
			}

			const target = interaction.options.getUser('user', true);

			const entry = await prisma.minecraftWhitelist.findUnique({
				where: { userId_guildId: { userId: target.id, guildId } },
			});
			if (!entry) {
				await interaction.editReply(`${target.username} does not have a whitelisted Minecraft account.`);
				return;
			}

			try {
				await rconCommand(`whitelist remove ${entry.minecraftUsername}`);
			} catch {
				await interaction.editReply('Could not reach the Minecraft server. Please try again later.');
				return;
			}

			await prisma.minecraftWhitelist.delete({
				where: { userId_guildId: { userId: target.id, guildId } },
			});

			const embed = new EmbedBuilder()
				.setTitle('Whitelist Removed')
				.setDescription(`\`${entry.minecraftUsername}\` has been removed from the Minecraft server whitelist.`)
				.addFields({ name: 'Discord User', value: `${target} (\`${target.id}\`)`, inline: true })
				.setColor(0xff6961)
				.setTimestamp();

			await interaction.editReply({ embeds: [embed] });
			return;
		}

		if (sub === 'list') {
			if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
				await interaction.editReply('You do not have permission to view the whitelist.');
				return;
			}

			const entries = await prisma.minecraftWhitelist.findMany({
				where: { guildId },
				orderBy: { addedAt: 'asc' },
			});

			const embed = new EmbedBuilder()
				.setTitle('Minecraft Whitelist')
				.setColor(0x5865f2)
				.setFooter({ text: `${entries.length} account${entries.length !== 1 ? 's' : ''}` })
				.setTimestamp();

			if (entries.length === 0) {
				embed.setDescription('No accounts are whitelisted yet.');
			} else {
				const lines = entries.map((e) => `<@${e.userId}> — \`${e.minecraftUsername}\``);
				let description = '';
				let shown = 0;
				for (const line of lines) {
					if (description.length + line.length + 1 > 3900) break;
					description += (description ? '\n' : '') + line;
					shown++;
				}
				if (shown < entries.length) description += `\n*...and ${entries.length - shown} more*`;
				embed.setDescription(description);
			}

			await interaction.editReply({ embeds: [embed] });
		}
	},
};

export default command;
