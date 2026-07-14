import { Message, GuildMember, PermissionFlagsBits } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { botDeletedMessages } from '../../lib/botDeletedTracking';
import { applyPunishment } from '../../lib/moderationActions';

const WINDOW_MS = 5000;
const FLOOD_THRESHOLD = 7;
const CROSSCHAN_THRESHOLD = 3;
const CLEANUP_INTERVAL_MS = 60_000;

type SpamEntry = { messages: Message[]; resetAt: number };

const tracker = new Map<string, SpamEntry>();

setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of tracker) {
		if (now > entry.resetAt) tracker.delete(key);
	}
}, CLEANUP_INTERVAL_MS);

async function suspendForSpam(member: GuildMember, reason: string): Promise<void> {
	const result = await applyPunishment({
		action: 'suspend',
		guild: member.guild,
		targetUser: member.user,
		targetMember: member,
		moderator: { user: member.client.user!, member: null },
		reason,
		titlePrefix: '[AUTO] ',
	});

	if (!result.ok) {
		console.error(`[automod] Failed to suspend ${member.id} in ${member.guild.id}: ${result.failureMessage}`);
	}
}

const event: EventFile = {
	async execute(message: Message) {
		if (!message.inGuild() || message.author.bot) return;

		const member = message.member;
		if (!member?.manageable) return;
		if (member.permissions.has(PermissionFlagsBits.ManageMessages)) return;

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
			await Promise.all(toDelete.map((m) => m.delete().catch(() => botDeletedMessages.delete(m.id))));
			await suspendForSpam(member, 'Automod: Cross-channel spam (likely bot)');
			return;
		}

		if (entry.messages.length >= FLOOD_THRESHOLD) {
			tracker.delete(key);
			await suspendForSpam(member, 'Automod: Spamming');
		}
	},
};

export default event;
