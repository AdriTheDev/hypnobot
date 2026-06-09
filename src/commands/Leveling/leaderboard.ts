import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, Colors } from 'discord.js';
import type { Command } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { resolveLevel } from '../../lib/levelingUtils';

const MEDALS = ['🥇', '🥈', '🥉'];

const command: Command = {
	data: new SlashCommandBuilder().setName('leaderboard').setDescription('Show the top 10 members by XP in this server.'),

	cooldown: 15,

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply();

		const guildId = interaction.guildId!;

		const top = await prisma.userLevel.findMany({
			where: { guildId },
			orderBy: { xp: 'desc' },
			take: 10,
		});

		if (top.length === 0) {
			await interaction.editReply('No one has earned any XP in this server yet!');
			return;
		}

		const lines = await Promise.all(
			top.map(async (m, i) => {
				const user = await interaction.client.users.fetch(m.userId).catch(() => null);
				const name = user ? user : m.userId;
				const medal = MEDALS[i] ?? `**${i + 1}.**`;
				const { level, currentLevelXP, requiredXP } = resolveLevel(Number(m.xp));
				return `${medal} ${name} - Level ${level} (${currentLevelXP.toLocaleString()}/${requiredXP.toLocaleString()} XP)`;
			}),
		);

		const embed = new EmbedBuilder()
			.setTitle(`🏆 ${interaction.guild!.name} Leaderboard`)
			.setDescription(lines.join('\n') || 'No one has earned any XP in this server yet!')
			.setColor(0xfd86f3)
			.setTimestamp()
			.setFooter({ text: 'Top 10 members by total XP' });

		await interaction.editReply({ embeds: [embed] });
	},
};

export default command;
