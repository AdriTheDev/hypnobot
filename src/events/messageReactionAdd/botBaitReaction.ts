import { MessageReaction, PartialMessageReaction, User, PartialUser } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { applyPunishment } from '../../lib/moderationActions';
import { recordBotBaitBan } from '../../lib/botBaitUtils';

const event: EventFile = {
	async execute(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
		if (user.bot) return;

		const message = reaction.message.partial ? await reaction.message.fetch().catch(() => null) : reaction.message;
		if (!message?.guild) return;

		const config = await prisma.guildConfig.findUnique({ where: { guildId: message.guild.id } });
		if (!config?.botBaitChannel || !config.botBaitMessageId || message.id !== config.botBaitMessageId) return;

		const member = await message.guild.members.fetch(user.id).catch(() => null);
		if (!member) return;

		const targetUser = user.partial ? await user.fetch().catch(() => null) : user;
		if (!targetUser) return;

		const result = await applyPunishment({
			action: 'ban',
			guild: message.guild,
			targetUser,
			targetMember: member,
			moderator: { user: message.client.user!, member: null },
			reason: 'Bot bait: reacted to the trap warning message',
			titlePrefix: '[BOT BAIT] ',
		});

		if (!result.ok) {
			console.error(`[botBait] Failed to ban ${user.id} in ${message.guild.id}: ${result.failureMessage}`);
			return;
		}

		await recordBotBaitBan(message.guild, config.botBaitChannel, config.botBaitMessageId);
	},
};

export default event;
