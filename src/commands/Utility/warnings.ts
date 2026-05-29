import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../lib/types';
import { prisma } from '../../lib/prisma';

const command: Command = {
	data: new SlashCommandBuilder().setName('warnings').setDescription('View your warnings in this server.'),
	cooldown: 10,

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const warnings = await prisma.warning.findMany({
			where: { userId: interaction.user.id, guildId: interaction.guildId! },
			orderBy: { createdAt: 'desc' },
			take: 10,
		});

		const total = await prisma.warning.count({
			where: { userId: interaction.user.id, guildId: interaction.guildId! },
		});

		const embed = new EmbedBuilder()
			.setTitle(`Your Warnings`)
			.setColor(0xff6961)
			.setFooter({ text: `${total} total warning${total !== 1 ? 's' : ''}` })
			.setTimestamp();

		if (warnings.length === 0) {
			embed.setDescription('You have no warnings in this server.').setColor(0x77dd77);
		} else {
			for (const w of warnings) {
				embed.addFields({
					name: `\`${w.id}\``,
					value: `**Reason:** ${w.reason}\n<t:${Math.floor(w.createdAt.getTime() / 1000)}:f>`,
				});
			}
		}

		await interaction.editReply({ embeds: [embed] });
	},
};

export default command;
