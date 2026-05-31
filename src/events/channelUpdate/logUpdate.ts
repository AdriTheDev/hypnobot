import { GuildChannel, DMChannel, EmbedBuilder, ChannelType, TextChannel, VoiceChannel } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { sendLog } from '../../lib/logWebhook';

const event: EventFile = {
	async execute(oldChannel: GuildChannel | DMChannel, newChannel: GuildChannel | DMChannel) {
		if (!('guild' in newChannel) || !('guild' in oldChannel)) return;

		const changes: { name: string; before: string; after: string }[] = [];

		if (oldChannel.name !== newChannel.name) {
			changes.push({ name: 'Name', before: oldChannel.name, after: newChannel.name });
		}

		if (oldChannel.parentId !== newChannel.parentId) {
			changes.push({
				name: 'Category',
				before: oldChannel.parent?.name ?? 'None',
				after: newChannel.parent?.name ?? 'None',
			});
		}

		if (
			newChannel.type === ChannelType.GuildText ||
			newChannel.type === ChannelType.GuildAnnouncement ||
			newChannel.type === ChannelType.GuildForum
		) {
			const oldText = oldChannel as TextChannel;
			const newText = newChannel as TextChannel;

			if (oldText.topic !== newText.topic) {
				changes.push({
					name: 'Topic',
					before: oldText.topic || 'None',
					after: newText.topic || 'None',
				});
			}

			if (oldText.nsfw !== newText.nsfw) {
				changes.push({ name: 'NSFW', before: String(oldText.nsfw), after: String(newText.nsfw) });
			}

			if (oldText.rateLimitPerUser !== newText.rateLimitPerUser) {
				changes.push({
					name: 'Slowmode',
					before: `${oldText.rateLimitPerUser}s`,
					after: `${newText.rateLimitPerUser}s`,
				});
			}
		}

		if (newChannel.type === ChannelType.GuildVoice || newChannel.type === ChannelType.GuildStageVoice) {
			const oldVoice = oldChannel as VoiceChannel;
			const newVoice = newChannel as VoiceChannel;

			if (oldVoice.bitrate !== newVoice.bitrate) {
				changes.push({ name: 'Bitrate', before: `${oldVoice.bitrate / 1000}kbps`, after: `${newVoice.bitrate / 1000}kbps` });
			}

			if (oldVoice.userLimit !== newVoice.userLimit) {
				changes.push({
					name: 'User Limit',
					before: oldVoice.userLimit === 0 ? 'Unlimited' : String(oldVoice.userLimit),
					after: newVoice.userLimit === 0 ? 'Unlimited' : String(newVoice.userLimit),
				});
			}
		}

		if (!changes.length) return;

		const config = await prisma.guildConfig.findUnique({ where: { guildId: newChannel.guild.id } });
		if (!config?.serverLogChannel) return;

		const embed = new EmbedBuilder()
			.setTitle('Channel Updated')
			.setColor(0xffc067)
			.addFields(
				{ name: 'Channel', value: `${newChannel} (\`${newChannel.id}\`)` },
				...changes.flatMap((c) => [
					{ name: `${c.name} — Before`, value: c.before, inline: true },
					{ name: `${c.name} — After`, value: c.after, inline: true },
					{ name: '​', value: '​', inline: true },
				]),
			)
			.setTimestamp();

		await sendLog(newChannel.guild, config.serverLogChannel, embed);
	},
};

export default event;
