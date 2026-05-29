import { Collection, ChatInputCommandInteraction, type Interaction } from 'discord.js';
import type { EventFile, ExtendedClient } from '../../lib/types';

const event: EventFile = {
	async execute(interaction: Interaction) {
		if (!interaction.isChatInputCommand()) return;

		const client = interaction.client as ExtendedClient;
		const command = client.commands.get(interaction.commandName);

		if (!command) {
			await interaction.reply({
				content: 'Unknown command.',
				ephemeral: true,
			});
			return;
		}

		const ownerIds = (process.env.OWNER_IDS ?? '').split(',').map((id) => id.trim());
		if (command.ownerOnly && !ownerIds.includes(interaction.user.id)) {
			await interaction.reply({
				content: 'This command is restricted to bot owners.',
				ephemeral: true,
			});
			return;
		}

		if (!client.cooldowns.has(command.data.name)) {
			client.cooldowns.set(command.data.name, new Collection<string, number>());
		}

		const timestamps = client.cooldowns.get(command.data.name)!;
		const cooldownMs = (command.cooldown ?? 3) * 1_000;
		const now = Date.now();
		const userId = interaction.user.id;

		if (timestamps.has(userId)) {
			const expiresAt = timestamps.get(userId)! + cooldownMs;
			if (now < expiresAt) {
				const remaining = ((expiresAt - now) / 1_000).toFixed(1);
				await interaction.reply({
					content: `Please wait **${remaining}s** before using \`/${command.data.name}\` again.`,
					ephemeral: true,
				});
				return;
			}
		}

		timestamps.set(userId, now);
		setTimeout(() => timestamps.delete(userId), cooldownMs);

		try {
			await command.execute(interaction as ChatInputCommandInteraction, client);
		} catch (err) {
			console.error(`[Command Error] /${command.data.name}:`, err);
			const msg = {
				content: 'An error occurred while running this command.',
				ephemeral: true,
			};
			if (interaction.deferred || interaction.replied) {
				await interaction.followUp(msg).catch(() => null);
			} else {
				await interaction.reply(msg).catch(() => null);
			}
		}
	},
};

export default event;
