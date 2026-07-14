import {
	SlashCommandBuilder,
	PermissionFlagsBits,
	ChatInputCommandInteraction,
	TextChannel,
	ChannelType,
	User,
	EmbedBuilder,
} from 'discord.js';
import type { Command } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { sendLog } from '../../lib/botStatus';
import { botDeletedMessages } from '../../lib/botDeletedTracking';

async function deleteMessages(channel: TextChannel, amount: number, filterUser: User | null): Promise<number> {
	let totalDeleted = 0;
	let lastId: string | undefined;

	while (totalDeleted < amount) {
		const fetched = await channel.messages.fetch({
			limit: 100,
			before: lastId,
		});
		if (fetched.size === 0) break;

		lastId = fetched.last()!.id;

		let batch = [...fetched.values()];
		if (filterUser) batch = batch.filter((m) => m.author.id === filterUser.id);
		batch = batch.slice(0, amount - totalDeleted);

		if (batch.length === 0) {
			if (fetched.size < 100) break;
			continue;
		}

		if (batch.length === 1) {
			botDeletedMessages.add(batch[0].id);
			await batch[0].delete().catch(() => botDeletedMessages.delete(batch[0].id));
			totalDeleted++;
		} else {
			const deleted = await channel.bulkDelete(batch, true);
			const count = deleted.size;
			totalDeleted += count;
			if (count === 0) break;
		}

		if (fetched.size < 100) break;

		await new Promise((r) => setTimeout(r, 1100));
	}

	return totalDeleted;
}

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('purge')
		.setDescription('Bulk delete messages from a channel.')
		.addIntegerOption((opt) =>
			opt
				.setName('amount')
				.setDescription('Number of messages to delete (1-1000).')
				.setMinValue(1)
				.setMaxValue(1000)
				.setRequired(true),
		)
		.addUserOption((opt) => opt.setName('user').setDescription('Only delete messages from this user.').setRequired(false))
		.addChannelOption((opt) =>
			opt
				.setName('channel')
				.setDescription('Channel to purge (defaults to current).')
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(false),
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const amount = interaction.options.getInteger('amount', true);
		const filterUser = interaction.options.getUser('user');
		const channel = (interaction.options.getChannel('channel') ?? interaction.channel) as TextChannel;

		if (!channel?.isTextBased()) {
			await interaction.editReply('Invalid channel.');
			return;
		}

		const deleted = await deleteMessages(channel, amount, filterUser);

		await interaction.editReply(
			deleted === 0
				? 'No deletable messages found (messages older than 14 days cannot be bulk deleted).'
				: `Deleted **${deleted}** message(s) in ${channel}.`,
		);

		if (deleted > 0 && interaction.guild) {
			const config = await prisma.guildConfig.findUnique({ where: { guildId: interaction.guild.id } });
			if (config?.modLogChannel) {
				const embed = new EmbedBuilder()
					.setTitle('Messages Purged')
					.setColor(0xff6961)
					.addFields(
						{ name: 'Channel', value: `<#${channel.id}>`, inline: true },
						{ name: 'Messages Deleted', value: `\`${deleted}\``, inline: true },
						{ name: 'Moderator', value: `${interaction.user} (\`${interaction.user.id}\`)` },
					)
					.setFooter({ text: `Channel ID: ${channel.id}` })
					.setTimestamp();

				if (filterUser) {
					embed.addFields({ name: 'Filtered User', value: `${filterUser} (\`${filterUser.id}\`)`, inline: true });
				}

				await sendLog(interaction.guild, config.modLogChannel, embed);
			}
		}
	},
};

export default command;
