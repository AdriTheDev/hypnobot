import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command, ExtendedClient } from '../../lib/types';

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Show help about available commands.')
		.addStringOption((opt) => opt.setName('category').setDescription('Filter commands by a specific category.').setRequired(false)),

	cooldown: 5,

	async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
		const filter = interaction.options.getString('category')?.toLowerCase();
		const ownerIds = (process.env.OWNER_IDS ?? '').split(',').map((id) => id.trim());
		const isOwner = ownerIds.includes(interaction.user.id);
		const memberPerms = interaction.memberPermissions;

		const categories = new Map<string, Command[]>();
		for (const cmd of client.commands.values()) {
			if (cmd.deleted) continue;
			if (cmd.ownerOnly && !isOwner) continue;

			const requiredPerms = cmd.data.toJSON().default_member_permissions;
			if (requiredPerms !== null && requiredPerms !== undefined) {
				if (!memberPerms?.has(BigInt(requiredPerms))) continue;
			}

			const cat = cmd.category ?? 'Uncategorised';
			if (filter && cat.toLowerCase() !== filter) continue;
			if (!categories.has(cat)) categories.set(cat, []);
			categories.get(cat)!.push(cmd);
		}

		if (categories.size === 0) {
			await interaction.reply({ content: 'No commands found for that category.', ephemeral: true });
			return;
		}

		let totalVisible = 0;
		const embed = new EmbedBuilder()
			.setTitle(filter ? `Commands: ${filter}` : 'Available Commands')
			.setColor(0xfd86f3)
			.setTimestamp();

		for (const [category, cmds] of categories) {
			totalVisible += cmds.length;
			const lines = cmds.map((c) => {
				const tags: string[] = [];
				if (c.ownerOnly) tags.push('owner');
				if (c.cooldown && c.cooldown > 3) tags.push(`${c.cooldown}s cooldown`);
				const suffix = tags.length ? ` *(${tags.join(', ')})*` : '';
				return `\`/${c.data.name}\`${suffix}`;
			});
			embed.addFields({ name: category, value: lines.join('\n'), inline: false });
		}

		embed.setFooter({ text: `${totalVisible} command(s) available • Use /help [category] to filter` });

		await interaction.reply({ embeds: [embed], ephemeral: true });
	},
};

export default command;
