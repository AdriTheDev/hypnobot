import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, ChannelType, TextChannel } from 'discord.js';
import type { Command } from '../../lib/types';
import { prisma } from '../../lib/prisma';

async function setAllChannels(
	guild: ChatInputCommandInteraction['guild'],
	allow: boolean,
	reason: string,
	exemptIds: string[],
): Promise<number> {
	const channels = guild!.channels.cache.filter((c) => c.type === ChannelType.GuildText) as Map<string, TextChannel>;
	let affected = 0;
	for (const [, channel] of channels) {
		if (exemptIds.includes(channel.id) || (channel.parentId !== null && exemptIds.includes(channel.parentId))) {
			continue;
		}
		if (allow) {
			await channel.lockPermissions().catch(() => null);
		} else {
			await channel.permissionOverwrites
				.edit(
					guild!.roles.everyone,
					{
						SendMessages: false,
						AddReactions: false,
						CreatePrivateThreads: false,
						CreatePublicThreads: false,
						SendMessagesInThreads: false,
					},
					{ reason },
				)
				.catch(() => null);
		}
		affected++;
	}
	return affected;
}

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('lockdown')
		.setDescription('Lock or unlock all text channels in the server.')
		.addSubcommand((sub) =>
			sub
				.setName('lock')
				.setDescription('Lock all text channels.')
				.addStringOption((opt) => opt.setName('reason').setDescription('Reason for the lockdown.').setRequired(true)),
		)
		.addSubcommand((sub) =>
			sub
				.setName('unlock')
				.setDescription('Unlock all text channels.')
				.addStringOption((opt) => opt.setName('reason').setDescription('Reason for lifting the lockdown.').setRequired(true)),
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const sub = interaction.options.getSubcommand();
		const reason = interaction.options.getString('reason', true);

		const currentChannel = interaction.channel as TextChannel;

		const locking = sub === 'lock';

		const config = await prisma.guildConfig.findUnique({ where: { guildId: interaction.guildId! } });
		const exemptIds = config?.lockdownExemptChannels ?? [];

		await setAllChannels(interaction.guild!, !locking, reason, exemptIds);

		const embed = new EmbedBuilder()
			.setTitle(locking ? '🔒 Server Lockdown' : '🔓 Lockdown Lifted')
			.setDescription(`**Reason:** ${reason}`)
			.setColor(locking ? 0xff6961 : 0x77dd77)
			.setFooter({
				text: `${locking ? 'Locked' : 'Unlocked'} by ${interaction.user.tag}`,
			})
			.setTimestamp();

		await Promise.all([interaction.editReply({ embeds: [embed] }), currentChannel.send({ embeds: [embed] }).catch(() => null)]);
	},
};

export default command;
