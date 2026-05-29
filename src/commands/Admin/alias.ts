import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, Colors } from 'discord.js';
import type { Command } from '../../lib/types';
import { prisma } from '../../lib/prisma';

const ALIAS_TYPES = [
	{ name: 'Global (all actions)', value: 'global' },
	{ name: 'Warn', value: 'warn' },
	{ name: 'Kick', value: 'kick' },
	{ name: 'Ban', value: 'ban' },
	{ name: 'Mute', value: 'mute' },
] as const;

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('alias')
		.setDescription('Manage reason aliases for moderation commands.')
		.addSubcommand((sub) =>
			sub
				.setName('list')
				.setDescription('List all configured aliases.')
				.addStringOption((opt) =>
					opt
						.setName('type')
						.setDescription('Filter by type.')
						.setRequired(false)
						.addChoices(...ALIAS_TYPES),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName('set')
				.setDescription('Create or update an alias.')
				.addStringOption((opt) =>
					opt
						.setName('type')
						.setDescription('Command type.')
						.setRequired(true)
						.addChoices(...ALIAS_TYPES),
				)
				.addStringOption((opt) => opt.setName('name').setDescription('Alias shorthand (e.g. "spam").').setRequired(true))
				.addStringOption((opt) => opt.setName('value').setDescription('Full reason text.').setRequired(true)),
		)
		.addSubcommand((sub) =>
			sub
				.setName('remove')
				.setDescription('Remove an alias.')
				.addStringOption((opt) =>
					opt
						.setName('type')
						.setDescription('Command type.')
						.setRequired(true)
						.addChoices(...ALIAS_TYPES),
				)
				.addStringOption((opt) => opt.setName('name').setDescription('Alias shorthand to remove.').setRequired(true)),
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const sub = interaction.options.getSubcommand();
		const guildId = interaction.guildId!;

		if (sub === 'list') {
			const typeFilter = interaction.options.getString('type');
			const aliases = await prisma.guildAlias.findMany({
				where: { guildId, ...(typeFilter ? { type: typeFilter } : {}) },
				orderBy: [{ type: 'asc' }, { name: 'asc' }],
			});

			if (aliases.length === 0) {
				await interaction.editReply('No aliases configured for this server.');
				return;
			}

			const grouped = new Map<string, typeof aliases>();
			for (const alias of aliases) {
				if (!grouped.has(alias.type)) grouped.set(alias.type, []);
				grouped.get(alias.type)!.push(alias);
			}

			const embed = new EmbedBuilder().setTitle('Reason Aliases').setColor(Colors.Blurple).setTimestamp();
			for (const [type, list] of grouped) {
				embed.addFields({
					name: type,
					value: list.map((a) => `\`${a.name}\` → ${a.value}`).join('\n'),
				});
			}

			await interaction.editReply({ embeds: [embed] });
			return;
		}

		if (sub === 'set') {
			const type = interaction.options.getString('type', true);
			const name = interaction.options.getString('name', true).toLowerCase();
			const value = interaction.options.getString('value', true);

			await prisma.guildAlias.upsert({
				where: { guildId_type_name: { guildId, type, name } },
				create: { guildId, type, name, value },
				update: { value },
			});

			await interaction.editReply(`Alias \`${name}\` for **${type}** set to: ${value}`);
			return;
		}

		if (sub === 'remove') {
			const type = interaction.options.getString('type', true);
			const name = interaction.options.getString('name', true).toLowerCase();

			const deleted = await prisma.guildAlias.deleteMany({
				where: { guildId, type, name },
			});

			if (deleted.count === 0) {
				await interaction.editReply(`No alias named \`${name}\` found for **${type}**.`);
				return;
			}

			await interaction.editReply(`Alias \`${name}\` for **${type}** removed.`);
		}
	},
};

export default command;
