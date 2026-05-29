import type { Message } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { resolveLevel, randomXP } from '../../lib/levelingUtils';

const xpCooldowns = new Map<string, number>();
const XP_COOLDOWN_MS = 60_000;

const event: EventFile = {
	async execute(message: Message) {
		if (message.author.bot || !message.inGuild() || !message.member) return;

		const userId = message.author.id;
		const guildId = message.guild.id;

		await prisma.userLevel.upsert({
			where: { userId_guildId: { userId, guildId } },
			create: { userId, guildId, xp: 0, level: 0, messages: 1 },
			update: { messages: { increment: 1 } },
		});

		const config = await prisma.guildConfig.findUnique({ where: { guildId } });
		if (config?.noXpChannels.includes(message.channel.id)) return;
		if (config?.noXpRoles.some((r) => message.member!.roles.cache.has(r))) return;

		const key = `${guildId}:${userId}`;
		const now = Date.now();
		if (now - (xpCooldowns.get(key) ?? 0) < XP_COOLDOWN_MS) return;

		xpCooldowns.set(key, now);

		const gained = randomXP(15, 25);

		const record = await prisma.userLevel.update({
			where: { userId_guildId: { userId, guildId } },
			data: { xp: { increment: gained } },
		});

		const { level } = resolveLevel(record.xp);

		if (level > record.level) {
			await prisma.userLevel.update({
				where: { userId_guildId: { userId, guildId } },
				data: { level },
			});
			await message.channel.send(`🎉 ${message.author} leveled up to **Level ${level}**!`).catch(() => null);
		}
	},
};

export default event;
