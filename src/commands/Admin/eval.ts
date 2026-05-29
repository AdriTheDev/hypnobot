import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	ModalBuilder,
	ActionRowBuilder,
	TextInputBuilder,
	TextInputStyle,
} from 'discord.js';
import { inspect } from 'util';
import type { Command, ExtendedClient } from '../../lib/types';

const command: Command = {
	data: new SlashCommandBuilder().setName('eval').setDescription('Execute arbitrary code (owner only).'),

	ownerOnly: true,

	async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
		const modal = new ModalBuilder()
			.setCustomId('eval-modal')
			.setTitle('Eval')
			.setComponents(
				new ActionRowBuilder<TextInputBuilder>().setComponents(
					new TextInputBuilder({ custom_id: 'code', label: 'Code', style: TextInputStyle.Paragraph, required: true }),
				),
			);

		await interaction.showModal(modal);

		const submission = await interaction
			.awaitModalSubmit({
				filter: (i) => i.customId === 'eval-modal' && i.user.id === interaction.user.id,
				time: 300_000,
			})
			.catch(() => null);

		if (!submission) return;

		await submission.deferReply({ ephemeral: true });

		const code = submission.fields.getTextInputValue('code');

		let output: string;
		try {
			let evaled: unknown = eval(`(async (interaction, client) => { ${code} })(interaction, client)`);
			if (evaled instanceof Promise) evaled = await evaled;
			output = typeof evaled === 'string' ? evaled : inspect(evaled, { depth: 2 });
		} catch (err) {
			output = String(err);
		}

		const truncated = output.length > 1900 ? `${output.slice(0, 1900)}\n…(truncated)` : output;
		await submission.editReply(`\`\`\`js\n${truncated}\n\`\`\``);
	},
};

export default command;
