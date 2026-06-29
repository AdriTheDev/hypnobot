import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../../lib/types';
import { prisma } from '../../lib/prisma';

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('alt')
		.setDescription('Manage linked alt accounts.')
		.addSubcommand((sub) =>
			sub
				.setName('link')
				.setDescription('Link two accounts so mod actions apply to both.')
				.addUserOption((opt) => opt.setName('user').setDescription('First account.').setRequired(true))
				.addUserOption((opt) => opt.setName('alt').setDescription('Alt account to link.').setRequired(true)),
		)
		.addSubcommand((sub) =>
			sub
				.setName('unlink')
				.setDescription('Remove a link between two accounts.')
				.addUserOption((opt) => opt.setName('user').setDescription('First account.').setRequired(true))
				.addUserOption((opt) => opt.setName('alt').setDescription('Alt account to unlink.').setRequired(true)),
		)
		.addSubcommand((sub) =>
			sub
				.setName('list')
				.setDescription('List all accounts linked to a user.')
				.addUserOption((opt) => opt.setName('user').setDescription('User to look up.').setRequired(true)),
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const sub = interaction.options.getSubcommand();
		const guildId = interaction.guildId!;

		if (sub === 'link') {
			const user = interaction.options.getUser('user', true);
			const alt = interaction.options.getUser('alt', true);

			if (user.id === alt.id) {
				await interaction.editReply('Cannot link an account to itself.');
				return;
			}

			const [userId, altId] = user.id < alt.id ? [user.id, alt.id] : [alt.id, user.id];

			const existing = await prisma.accountLink.findUnique({
				where: { guildId_userId_altId: { guildId, userId, altId } },
			});
			if (existing) {
				await interaction.editReply('These accounts are already linked.');
				return;
			}

			await prisma.accountLink.create({ data: { guildId, userId, altId } });
			await interaction.editReply(`Linked ${user} and ${alt}.`);
			return;
		}

		if (sub === 'unlink') {
			const user = interaction.options.getUser('user', true);
			const alt = interaction.options.getUser('alt', true);

			const [userId, altId] = user.id < alt.id ? [user.id, alt.id] : [alt.id, user.id];

			const deleted = await prisma.accountLink.deleteMany({ where: { guildId, userId, altId } });
			if (deleted.count === 0) {
				await interaction.editReply('Those accounts are not linked.');
				return;
			}

			await interaction.editReply(`Unlinked ${user} and ${alt}.`);
			return;
		}

		if (sub === 'list') {
			const user = interaction.options.getUser('user', true);

			const links = await prisma.accountLink.findMany({
				where: { guildId, OR: [{ userId: user.id }, { altId: user.id }] },
			});

			if (links.length === 0) {
				await interaction.editReply(`${user.username} has no linked accounts.`);
				return;
			}

			const linkedIds = links.map((l) => (l.userId === user.id ? l.altId : l.userId));
			const embed = new EmbedBuilder()
				.setTitle(`Linked accounts: ${user.username}`)
				.setDescription(linkedIds.map((id) => `<@${id}> (\`${id}\`)`).join('\n'))
				.setColor(0x5865f2)
				.setThumbnail(user.displayAvatarURL());

			await interaction.editReply({ embeds: [embed] });
		}
	},
};

export default command;
