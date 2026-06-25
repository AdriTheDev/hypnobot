import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, Colors } from 'discord.js';
import type { Command, ExtendedClient } from '../../lib/types';

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Browse all available commands by category.')
		.addStringOption((opt) => opt.setName('category').setDescription('Filter commands by a specific category.').setRequired(false)),

	cooldown: 5,

	async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
		const filter = interaction.options.getString('category')?.toLowerCase();

		const categories = new Map<string, Command[]>();
		for (const cmd of client.commands.values()) {
			if (cmd.deleted) continue;
			const cat = cmd.category ?? 'Uncategorised';
			if (filter && cat.toLowerCase() !== filter) continue;
			if (!categories.has(cat)) categories.set(cat, []);
			categories.get(cat)!.push(cmd);
		}

		if (categories.size === 0) {
			await interaction.reply({
				content: 'No commands found for that category.',
				ephemeral: true,
			});
			return;
		}

		const embed = new EmbedBuilder()
			.setTitle(filter ? `Commands: ${filter}` : 'All Commands')
			.setColor(0xfd86f3)
			.setFooter({
				text: `${client.commands.size} command(s) loaded • Use /help [category] to filter`,
			})
			.setTimestamp();

		for (const [category, cmds] of categories) {
			const lines = cmds.map((c) => {
				const tags: string[] = [];
				if (c.ownerOnly) tags.push('owner');
				if (c.cooldown && c.cooldown > 3) tags.push(`${c.cooldown}s cooldown`);
				const suffix = tags.length ? ` *(${tags.join(', ')})*` : '';
				return `\`/${c.data.name}\`${suffix}`;
			});
			embed.addFields({
				name: category,
				value: lines.join('\n'),
				inline: false,
			});
		}

		await interaction.reply({ embeds: [embed], ephemeral: true });
	},
};

export default command;
