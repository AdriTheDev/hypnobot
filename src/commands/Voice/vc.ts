import { ChannelType, ChatInputCommandInteraction, GuildMember, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../lib/types';
import { prisma } from '../../lib/prisma';

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('vc')
		.setDescription('Manage your Join-to-Create voice channel.')
		.addSubcommand((sub) =>
			sub
				.setName('name')
				.setDescription('Rename your voice channel.')
				.addStringOption((opt) => opt.setName('name').setDescription('New channel name.').setRequired(true).setMaxLength(100)),
		)
		.addSubcommand((sub) =>
			sub
				.setName('user_limit')
				.setDescription('Set the user limit for your voice channel.')
				.addIntegerOption((opt) =>
					opt.setName('limit').setDescription('Max members (0 = unlimited).').setRequired(true).setMinValue(0).setMaxValue(99),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName('manager')
				.setDescription('Transfer VC manager to another member in the channel.')
				.addUserOption((opt) => opt.setName('user').setDescription('New manager.').setRequired(true)),
		)
		.addSubcommand((sub) => sub.setName('lock').setDescription('Lock the VC to the current number of members.'))
		.addSubcommand((sub) => sub.setName('unlock').setDescription('Remove the user limit from the VC.'))
		.addSubcommand((sub) =>
			sub
				.setName('kick')
				.setDescription('Disconnect a member from the VC.')
				.addUserOption((opt) => opt.setName('user').setDescription('Member to kick.').setRequired(true)),
		)
		.addSubcommand((sub) =>
			sub
				.setName('ban')
				.setDescription('Ban a member from the VC.')
				.addUserOption((opt) => opt.setName('user').setDescription('Member to ban.').setRequired(true)),
		)
		.addSubcommand((sub) =>
			sub
				.setName('unban')
				.setDescription('Unban a member from the VC.')
				.addUserOption((opt) => opt.setName('user').setDescription('Member to unban.').setRequired(true)),
		)
		.addSubcommand((sub) => sub.setName('ghost').setDescription('Make the VC invisible to everyone not currently in it.'))
		.addSubcommand((sub) => sub.setName('unghost').setDescription('Make the VC visible to everyone again.')),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const member = interaction.member as GuildMember;
		const voiceChannelId = member.voice?.channelId;

		if (!voiceChannelId) {
			await interaction.editReply('You must be in a voice channel to use this command.');
			return;
		}

		const vc = await prisma.joinToCreateVC.findUnique({ where: { channelId: voiceChannelId } });
		if (!vc) {
			await interaction.editReply('You are not in a managed voice channel.');
			return;
		}

		const isManager = interaction.user.id === vc.managerId;
		const isMod = interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages) ?? false;

		if (!isManager && !isMod) {
			await interaction.editReply('Only the VC manager or a moderator can use this command.');
			return;
		}

		const guild = interaction.guild!;
		const channel = guild.channels.cache.get(vc.channelId);
		if (!channel || channel.type !== ChannelType.GuildVoice) {
			await interaction.editReply('Could not find the voice channel.');
			return;
		}

		const sub = interaction.options.getSubcommand();

		if (sub === 'name') {
			const name = interaction.options.getString('name', true);
			await channel.setName(name);
			await interaction.editReply(`Channel renamed to **${name}**.`);
			return;
		}

		if (sub === 'user_limit') {
			const limit = interaction.options.getInteger('limit', true);
			await channel.setUserLimit(limit);
			await interaction.editReply(limit === 0 ? 'User limit removed.' : `User limit set to **${limit}**.`);
			return;
		}

		if (sub === 'manager') {
			const target = interaction.options.getMember('user') as GuildMember | null;
			if (!target) {
				await interaction.editReply('That member could not be found.');
				return;
			}
			if (!channel.members.has(target.id)) {
				await interaction.editReply('That member is not in this voice channel.');
				return;
			}

			if (target.id === interaction.user.id) {
				await interaction.editReply('You are already the VC manager.');
				return;
			}

			if (target.user.bot) {
				await interaction.editReply('You cannot transfer VC manager to a bot.');
				return;
			}

			await prisma.joinToCreateVC.update({
				where: { channelId: vc.channelId },
				data: { managerId: target.id },
			});
			await interaction.editReply(`${target} is now the VC manager.`);
			return;
		}

		if (sub === 'lock') {
			const count = channel.members.size;
			await channel.setUserLimit(count);
			await interaction.editReply(`VC locked to **${count}** member${count === 1 ? '' : 's'}.`);
			return;
		}

		if (sub === 'unlock') {
			await channel.setUserLimit(0);
			await interaction.editReply('VC unlocked (no user limit).');
			return;
		}

		if (sub === 'kick') {
			const target = interaction.options.getMember('user') as GuildMember | null;
			if (!target) {
				await interaction.editReply('That member could not be found.');
				return;
			}
			if (target.id === interaction.user.id) {
				await interaction.editReply('You cannot kick yourself.');
				return;
			}

			if (target.user.bot) {
				await interaction.editReply('You cannot kick a bot from the VC.');
				return;
			}

			if (target.id === vc.managerId && !isMod) {
				await interaction.editReply('Only a moderator can kick the VC manager.');
				return;
			}
			if (!channel.members.has(target.id)) {
				await interaction.editReply('That member is not in this voice channel.');
				return;
			}
			await target.voice.disconnect();
			await interaction.editReply(`${target} has been disconnected from the VC.`);
			return;
		}

		if (sub === 'ban') {
			const target = interaction.options.getMember('user') as GuildMember | null;
			if (!target) {
				await interaction.editReply('That member could not be found.');
				return;
			}
			if (target.id === interaction.user.id) {
				await interaction.editReply('You cannot ban yourself.');
				return;
			}

			if (target.user.bot) {
				await interaction.editReply('You cannot ban a bot from the VC.');
				return;
			}

			if (target.id === vc.managerId && !isMod) {
				await interaction.editReply('Only a moderator can ban the VC manager.');
				return;
			}
			if (vc.bannedUserIds.includes(target.id)) {
				await interaction.editReply('That member is already banned from this VC.');
				return;
			}

			await channel.permissionOverwrites.edit(target, { ViewChannel: false });

			if (channel.members.has(target.id)) {
				await target.voice.disconnect();
			}

			await prisma.joinToCreateVC.update({
				where: { channelId: vc.channelId },
				data: { bannedUserIds: { push: target.id } },
			});

			await interaction.editReply(`${target} has been banned from this VC.`);
			return;
		}

		if (sub === 'unban') {
			const target = interaction.options.getUser('user', true);
			if (!vc.bannedUserIds.includes(target.id)) {
				await interaction.editReply('That user is not banned from this VC.');
				return;
			}

			const overwrite = channel.permissionOverwrites.cache.get(target.id);
			if (overwrite) await overwrite.delete();

			await prisma.joinToCreateVC.update({
				where: { channelId: vc.channelId },
				data: { bannedUserIds: vc.bannedUserIds.filter((id) => id !== target.id) },
			});

			await interaction.editReply(`${target} has been unbanned from this VC.`);
			return;
		}

		if (sub === 'ghost') {
			if (vc.isGhosted) {
				await interaction.editReply('This VC is already ghosted.');
				return;
			}

			await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });

			for (const m of channel.members.values()) {
				await channel.permissionOverwrites.edit(m, { ViewChannel: true, Connect: true });
			}

			await prisma.joinToCreateVC.update({
				where: { channelId: vc.channelId },
				data: { isGhosted: true },
			});

			await interaction.editReply('VC is now ghosted — invisible to everyone not currently in it.');
			return;
		}

		if (sub === 'unghost') {
			if (!vc.isGhosted) {
				await interaction.editReply('This VC is not ghosted.');
				return;
			}

			await channel.permissionOverwrites.delete(guild.roles.everyone);

			for (const [id, overwrite] of channel.permissionOverwrites.cache) {
				if (id === guild.roles.everyone.id) continue;
				if (vc.bannedUserIds.includes(id)) continue;
				await overwrite.delete();
			}

			await prisma.joinToCreateVC.update({
				where: { channelId: vc.channelId },
				data: { isGhosted: false },
			});

			await interaction.editReply('VC is now visible to everyone.');
			return;
		}
	},
};

export default command;
