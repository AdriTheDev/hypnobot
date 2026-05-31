import { VoiceState, EmbedBuilder } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { sendLog } from '../../lib/logWebhook';

const event: EventFile = {
	async execute(oldState: VoiceState, newState: VoiceState) {
		if (newState.member?.user.bot) return;

		const guild = newState.guild;
		const config = await prisma.guildConfig.findUnique({ where: { guildId: guild.id } });
		if (!config?.voiceLogChannel) return;

		const member = newState.member ?? oldState.member;
		if (!member) return;

		const joined = !oldState.channelId && !!newState.channelId;
		const left = !!oldState.channelId && !newState.channelId;
		const switched = !!oldState.channelId && !!newState.channelId && oldState.channelId !== newState.channelId;

		if (!joined && !left && !switched) return;

		const embed = new EmbedBuilder()
			.setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL() })
			.addFields({ name: 'User', value: `${member} (\`${member.id}\`)`, inline: true })
			.setTimestamp();

		if (joined) {
			embed
				.setTitle('Voice Channel Joined')
				.setColor(0x77dd77)
				.addFields({ name: 'Channel', value: `<#${newState.channelId}>`, inline: true });
		} else if (left) {
			embed
				.setTitle('Voice Channel Left')
				.setColor(0xff6961)
				.addFields({ name: 'Channel', value: `<#${oldState.channelId}>`, inline: true });
		} else {
			embed
				.setTitle('Voice Channel Switched')
				.setColor(0xfdfd96)
				.addFields(
					{ name: 'From', value: `<#${oldState.channelId}>`, inline: true },
					{ name: 'To', value: `<#${newState.channelId}>`, inline: true },
				);
		}

		await sendLog(guild, config.voiceLogChannel, embed);
	},
};

export default event;
