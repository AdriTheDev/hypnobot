import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command, ExtendedClient } from '../../lib/types';

const command: Command = {
	data: new SlashCommandBuilder().setName('ping').setDescription("Check the bot's latency."),

	cooldown: 5,

	async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
		const msg = await interaction.deferReply({ ephemeral: true });

		const latency = Date.now() - interaction.createdTimestamp;
		const apiLatency = Math.round(client.ws.ping);

		const embed = new EmbedBuilder()
			.setTitle('Pong! 🏓')
			.addFields(
				{ name: 'Latency', value: `\`${latency}ms\``, inline: true },
				{
					name: 'API Latency',
					value: `\`${apiLatency}ms\``,
					inline: true,
				},
			)
			.setColor(0xfd86f3)
			.setTimestamp();

		await msg.edit({ content: null, embeds: [embed] });
	},
};

export default command;
