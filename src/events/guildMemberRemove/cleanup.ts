import { GuildMember, PartialGuildMember, ChannelType, TextChannel, ForumChannel, MessageType } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

async function deleteMessagesInChannel(channel: TextChannel, userId: string): Promise<void> {
	let before: string | undefined;

	for (let page = 0; page < 10; page++) {
		const messages = await channel.messages.fetch({ limit: 100, before }).catch(() => null);
		if (!messages || messages.size === 0) break;

		const userMessages = messages.filter((m) => m.author.id === userId);
		const now = Date.now();

		const recent = userMessages.filter((m) => now - m.createdTimestamp < TWO_WEEKS_MS);
		const old = userMessages.filter((m) => now - m.createdTimestamp >= TWO_WEEKS_MS);

		if (recent.size > 1) {
			await channel.bulkDelete(recent).catch(() => null);
		} else if (recent.size === 1) {
			await recent
				.first()!
				.delete()
				.catch(() => null);
		}

		for (const [, msg] of old) {
			await msg.delete().catch(() => null);
		}

		before = messages.last()?.id;
		if (messages.size < 100) break;
	}
}

async function deleteThreadsInForum(forum: ForumChannel, userId: string): Promise<void> {
	const { threads } = await forum.threads.fetchActive().catch(() => ({ threads: new Map() }));
	for (const [, thread] of threads) {
		if (thread.ownerId === userId) {
			await thread.delete().catch(() => null);
		}
	}
}

const event: EventFile = {
	async execute(member: GuildMember | PartialGuildMember) {
		const [config, welcome] = await Promise.all([
			prisma.guildConfig.findUnique({ where: { guildId: member.guild.id } }),
			prisma.welcomeMessage.findUnique({ where: { userId_guildId: { userId: member.id, guildId: member.guild.id } } }),
		]);

		const systemChannel = member.guild.systemChannel;
		if (systemChannel) {
			const messages = await systemChannel.messages.fetch({ limit: 100 }).catch(() => null);
			if (messages) {
				const joinMessage = messages.find((m) => m.type === MessageType.UserJoin && m.author.id === member.id);
				await joinMessage?.delete().catch(() => null);
			}
		}

		if (welcome) {
			const welcomeChannel = member.guild.channels.cache.get(welcome.channelId);
			if (welcomeChannel?.isTextBased()) {
				const msg = await welcomeChannel.messages.fetch(welcome.messageId).catch(() => null);
				await msg?.delete().catch(() => null);
			}
			await prisma.welcomeMessage
				.delete({
					where: { userId_guildId: { userId: member.id, guildId: member.guild.id } },
				})
				.catch(() => null);
		}

		if (!config) return;

		if (config.introChannel) {
			const channel = member.guild.channels.cache.get(config.introChannel);

			if (channel?.type === ChannelType.GuildText) {
				await deleteMessagesInChannel(channel as TextChannel, member.id);
			} else if (channel?.type === ChannelType.GuildForum) {
				await deleteThreadsInForum(channel as ForumChannel, member.id);
			}
		}

		for (const forumId of config.forumChannels) {
			const forum = member.guild.channels.cache.get(forumId);
			if (forum?.type !== ChannelType.GuildForum) continue;
			await deleteThreadsInForum(forum as ForumChannel, member.id);
		}
	},
};

export default event;
