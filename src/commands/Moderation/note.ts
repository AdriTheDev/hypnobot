import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../../lib/types';
import { prisma } from '../../lib/prisma';

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('note')
		.setDescription('Manage private moderator notes for a user.')
		.addSubcommand((sub) =>
			sub
				.setName('add')
				.setDescription('Add a note to a user.')
				.addUserOption((opt) => opt.setName('user').setDescription('User to add a note for.').setRequired(true))
				.addStringOption((opt) => opt.setName('content').setDescription('Note content.').setRequired(true)),
		)
		.addSubcommand((sub) =>
			sub
				.setName('view')
				.setDescription('View all notes for a user.')
				.addUserOption((opt) => opt.setName('user').setDescription('User to view notes for.').setRequired(true)),
		)
		.addSubcommand((sub) =>
			sub
				.setName('remove')
				.setDescription('Remove a note by ID.')
				.addStringOption((opt) => opt.setName('id').setDescription('Note ID to remove.').setRequired(true)),
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const sub = interaction.options.getSubcommand();
		const guildId = interaction.guildId!;

		if (sub === 'add') {
			const target = interaction.options.getUser('user', true);
			const content = interaction.options.getString('content', true);

			const note = await prisma.userNote.create({
				data: { userId: target.id, guildId, content, authorId: interaction.user.id },
			});

			await interaction.editReply(`Note \`${note.id}\` added for ${target}.`);
			return;
		}

		if (sub === 'view') {
			const target = interaction.options.getUser('user', true);

			const notes = await prisma.userNote.findMany({
				where: { userId: target.id, guildId },
				orderBy: { createdAt: 'desc' },
				take: 25,
			});

			const embed = new EmbedBuilder()
				.setTitle(`Notes: ${target.username}`)
				.setColor(0xfd86f3)
				.setFooter({ text: `${notes.length} note${notes.length !== 1 ? 's' : ''}` })
				.setTimestamp();

			if (notes.length === 0) {
				embed.setDescription('No notes for this user.').setColor(0x77dd77);
			} else {
				for (const n of notes) {
					embed.addFields({
						name: `\`${n.id}\``,
						value: `${n.content}\n**By:** <@${n.authorId}> · <t:${Math.floor(n.createdAt.getTime() / 1000)}:f>`,
					});
				}
			}

			await interaction.editReply({ embeds: [embed] });
			return;
		}

		if (sub === 'remove') {
			const id = interaction.options.getString('id', true);
			const note = await prisma.userNote.findUnique({ where: { id } });

			if (!note || note.guildId !== guildId) {
				await interaction.editReply('Note not found.');
				return;
			}

			await prisma.userNote.delete({ where: { id } });
			await interaction.editReply(`Note \`${id}\` removed.`);
		}
	},
};

export default command;
