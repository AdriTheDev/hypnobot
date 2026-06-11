import { Message } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { botDeletedMessages } from '../../lib/botDeletedMessages';
import { buildModEmbed, sendModLog } from '../../lib/modUtils';

const WINDOW_MS = 5000;
const FLOOD_THRESHOLD = 5;
const FLOOD_TIMEOUT_MS = 5 * 60 * 1000;
const CROSSCHAN_THRESHOLD = 3;
const PERMANENT_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;

type SpamEntry = { messages: Message[]; resetAt: number };

const tracker = new Map<string, SpamEntry>();

const event: EventFile = {
	async execute(message: Message) {
		if (!message.inGuild() || message.author.bot) return;

		const member = message.member;
		if (!member?.moderatable) return;

		const key = `${message.guild.id}:${message.author.id}`;
		const now = Date.now();

		let entry = tracker.get(key);
		if (!entry || now > entry.resetAt) {
			entry = { messages: [], resetAt: now + WINDOW_MS };
			tracker.set(key, entry);
		}
		entry.messages.push(message);

		const channels = new Set(entry.messages.map((m) => m.channelId));

		if (channels.size >= CROSSCHAN_THRESHOLD) {
			const toDelete = entry.messages;
			tracker.delete(key);
			for (const msg of toDelete) botDeletedMessages.add(msg.id);
			await Promise.all(toDelete.map((m) => m.delete().catch(() => botDeletedMessages.delete(m.id))));
			await member.timeout(PERMANENT_TIMEOUT_MS, 'Automod: cross-channel spam');
			const embed = buildModEmbed({
				action: 'Member Muted (Automod)',
				target: message.author,
				moderator: message.guild.client.user!,
				reason: 'Cross-channel spam (likely bot)',
				duration: 'Permanent',
				color: 0xff6961,
			});
			await sendModLog(message.guild, embed);
			return;
		}

		if (entry.messages.length >= FLOOD_THRESHOLD) {
			tracker.delete(key);
			await member.timeout(FLOOD_TIMEOUT_MS, 'Automod: spamming');
			const embed = buildModEmbed({
				action: 'Member Muted (Automod)',
				target: message.author,
				moderator: message.guild.client.user!,
				reason: 'Spamming',
				duration: '5 minutes',
				color: 0xff6961,
			});
			await sendModLog(message.guild, embed);
		}
	},
};

export default event;
