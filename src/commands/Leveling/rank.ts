import { SlashCommandBuilder, AttachmentBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import type { Command } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { resolveLevel } from '../../lib/levelingUtils';
import { generateRankCard } from '../../lib/rankCard';

const DEFAULT_COLOR = '#FD86F3';

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('rank')
		.setDescription("Display a user's current rank and XP.")
		.addUserOption((opt) => opt.setName('user').setDescription('The user to check (defaults to you).').setRequired(false)),

	cooldown: 10,

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply();

		const target = interaction.options.getUser('user') ?? interaction.user;
		const guildId = interaction.guildId!;

		const record = await prisma.userLevel.findUnique({
			where: { userId_guildId: { userId: target.id, guildId } },
		});

		const rawXP = record?.xp ?? 0n;
		const totalXP = Number(rawXP);
		const { level, currentLevelXP, requiredXP } = resolveLevel(totalXP);

		const above = await prisma.userLevel.count({
			where: { guildId, xp: { gt: rawXP } },
		});
		const rank = above + 1;

		let color = DEFAULT_COLOR;
		try {
			const member = (await interaction.guild!.members.fetch(target.id)) as GuildMember;
			const roleColor = member.displayHexColor;
			if (roleColor && roleColor !== '#000000') color = roleColor;
		} catch {
			/* leave default */
		}

		const buffer = await generateRankCard({
			username: target.username,
			avatarUrl: target.displayAvatarURL({ extension: 'png', size: 256 }),
			level,
			rank,
			xp: currentLevelXP,
			xpNeeded: requiredXP,
			color,
		});

		const attachment = new AttachmentBuilder(buffer, { name: 'rank.png' });
		await interaction.editReply({ files: [attachment] });
	},
};

export default command;
