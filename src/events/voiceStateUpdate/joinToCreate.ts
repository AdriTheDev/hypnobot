import { ChannelType, EmbedBuilder, OverwriteType, PermissionFlagsBits, VoiceState } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { botDeletedChannels } from '../../lib/botDeletedChannels';

const VC_MANAGER_COMMANDS = [
	{ name: '/vc name', description: 'Rename your voice channel.' },
	{ name: '/vc user_limit', description: 'Set the user limit for your voice channel.' },
	{ name: '/vc manager', description: 'Transfer VC manager to another member in the channel.' },
	{ name: '/vc lock', description: 'Lock the VC to the current number of members.' },
	{ name: '/vc unlock', description: 'Remove the user limit from the VC.' },
	{ name: '/vc kick', description: 'Disconnect a member from the VC.' },
	{ name: '/vc ban', description: 'Ban a member from the VC.' },
	{ name: '/vc unban', description: 'Unban a member from the VC.' },
	{ name: '/vc ghost', description: 'Make the VC invisible to everyone not currently in it.' },
	{ name: '/vc unghost', description: 'Make the VC visible to everyone again.' },
];

const event: EventFile = {
	async execute(oldState: VoiceState, newState: VoiceState) {
		const member = newState.member ?? oldState.member;
		if (!member || member.user.bot) return;

		const guild = newState.guild;
		const config = await prisma.guildConfig.findUnique({ where: { guildId: guild.id } });
		if (!config?.joinToCreateChannel) return;

		// User joined the trigger channel — create a new VC and move them in
		if (newState.channelId === config.joinToCreateChannel) {
			const triggerChannel = guild.channels.cache.get(config.joinToCreateChannel);
			if (!triggerChannel || triggerChannel.type !== ChannelType.GuildVoice) return;

			const newVC = await guild.channels.create({
				name: `${member.user.username}'s VC`,
				type: ChannelType.GuildVoice,
				parent: triggerChannel.parentId,
				userLimit: 5,
			});

			await member.voice.setChannel(newVC);

			await prisma.joinToCreateVC.create({
				data: {
					channelId: newVC.id,
					guildId: guild.id,
					ownerId: member.id,
					managerId: member.id,
					memberIds: [member.id],
				},
			});

			const embed = new EmbedBuilder()
				.setTitle('VC Manager Commands')
				.setDescription(VC_MANAGER_COMMANDS.map((c) => `\`${c.name}\` — ${c.description}`).join('\n'))
				.setColor(0xfd86f3);

			const commandsMessage = await newVC.send({ content: `${member} is the VC manager.`, embeds: [embed] }).catch(() => null);
			await commandsMessage?.pin().catch(() => null);

			return;
		}

		// User left a tracked VC
		if (oldState.channelId) {
			const vc = await prisma.joinToCreateVC.findUnique({ where: { channelId: oldState.channelId } });
			if (vc) {
				const channel = guild.channels.cache.get(oldState.channelId);
				const voiceChannel = channel?.type === ChannelType.GuildVoice ? channel : null;

				if (!voiceChannel || voiceChannel.members.size === 0) {
					await prisma.joinToCreateVC.delete({ where: { channelId: oldState.channelId } });
					if (voiceChannel) {
						botDeletedChannels.add(voiceChannel.id);
						await voiceChannel.delete().catch(() => botDeletedChannels.delete(voiceChannel.id));
					}
				} else {
					const newMemberIds = vc.memberIds.filter((id) => id !== member.id);
					const newManagerId = vc.managerId === member.id && newMemberIds.length > 0 ? newMemberIds[0] : vc.managerId;

					await prisma.joinToCreateVC.update({
						where: { channelId: oldState.channelId },
						data: { memberIds: newMemberIds, managerId: newManagerId },
					});
				}
			}
		}

		// User joined a tracked VC (not the trigger)
		if (newState.channelId && newState.channelId !== config.joinToCreateChannel) {
			const vc = await prisma.joinToCreateVC.findUnique({ where: { channelId: newState.channelId } });
			if (vc && !vc.memberIds.includes(member.id)) {
				await prisma.joinToCreateVC.update({
					where: { channelId: newState.channelId },
					data: { memberIds: { push: member.id } },
				});
			}
		}
	},
};

export default event;
