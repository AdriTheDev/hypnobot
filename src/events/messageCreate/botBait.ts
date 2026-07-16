import { Message } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { applyPunishment } from '../../lib/moderationActions';
import { recordBotBaitBan } from '../../lib/botBaitUtils';

const event: EventFile = {
	async execute(message: Message) {
		if (!message.inGuild() || message.author.bot) return;

		const config = await prisma.guildConfig.findUnique({ where: { guildId: message.guild.id } });
		if (!config?.botBaitChannel || !config.botBaitMessageId || message.channelId !== config.botBaitChannel) return;

		const member = message.member;
		if (!member) return;

		const result = await applyPunishment({
			action: 'ban',
			guild: message.guild,
			targetUser: message.author,
			targetMember: member,
			moderator: { user: message.client.user!, member: null },
			reason: 'Bot bait: posted in a restricted trap channel',
			titlePrefix: '[BOT BAIT] ',
		});

		if (!result.ok) {
			console.error(`[botBait] Failed to ban ${message.author.id} in ${message.guild.id}: ${result.failureMessage}`);
			return;
		}

		await recordBotBaitBan(message.guild, config.botBaitChannel, config.botBaitMessageId);
	},
};

export default event;
