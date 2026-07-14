import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
} from 'discord.js';
import type { Command } from '../../lib/types';
import { buildMeowWordsEmbed, buildMeowUsersEmbed, buildMeowUserEmbed } from '../../lib/meow';

type BoardPage = 'words' | 'users';

function buildBoardRow(page: BoardPage): ActionRowBuilder<ButtonBuilder> {
	return new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder().setCustomId('meow_board_words').setLabel('Words').setStyle(ButtonStyle.Primary).setDisabled(page === 'words'),
		new ButtonBuilder().setCustomId('meow_board_users').setLabel('Users').setStyle(ButtonStyle.Primary).setDisabled(page === 'users'),
	);
}

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('meow')
		.setDescription('Track meow-like words said in this server.')
		.addSubcommand((sub) => sub.setName('board').setDescription('Show the meow meter leaderboard.'))
		.addSubcommand((sub) =>
			sub
				.setName('user')
				.setDescription("Show a user's meow word usage.")
				.addUserOption((opt) => opt.setName('user').setDescription('The user to check (defaults to you).').setRequired(false)),
		),

	cooldown: 5,

	async execute(interaction: ChatInputCommandInteraction) {
		const sub = interaction.options.getSubcommand();
		const guild = interaction.guild!;

		if (sub === 'user') {
			await interaction.deferReply();
			const target = interaction.options.getUser('user') ?? interaction.user;
			const embed = await buildMeowUserEmbed(guild, target);
			await interaction.editReply({ embeds: [embed] });
			return;
		}

		await interaction.deferReply();
		const embed = await buildMeowWordsEmbed(guild);
		const message = await interaction.editReply({ embeds: [embed], components: [buildBoardRow('words')] });

		const collector = message.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 60_000,
		});

		collector.on('collect', async (button) => {
			if (button.user.id !== interaction.user.id) {
				await button.reply({ content: 'Only the person who ran this command can switch pages.', ephemeral: true });
				return;
			}

			const page: BoardPage = button.customId === 'meow_board_users' ? 'users' : 'words';
			const nextEmbed = page === 'users' ? await buildMeowUsersEmbed(guild) : await buildMeowWordsEmbed(guild);
			await button.update({ embeds: [nextEmbed], components: [buildBoardRow(page)] });
		});

		collector.on('end', async () => {
			await interaction.editReply({ components: [] }).catch(() => null);
		});
	},
};

export default command;
