import { Client, WebhookClient, EmbedBuilder, Guild, ChannelType, TextChannel } from 'discord.js';
import { version } from '../../package.json';

let statusClient: WebhookClient | null = null;

function getStatusClient(): WebhookClient | null {
	if (!process.env.STATUS_WEBHOOK_URL) return null;
	if (!statusClient) statusClient = new WebhookClient({ url: process.env.STATUS_WEBHOOK_URL });
	return statusClient;
}

export async function logStatus(
	title: string,
	description: string,
	color: number,
	fields?: { name: string; value: string; inline?: boolean }[],
): Promise<void> {
	const wh = getStatusClient();
	if (!wh) return;
	const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(color).setTimestamp();
	if (fields?.length) embed.addFields(fields);
	await wh.send({ embeds: [embed] }).catch((err) => console.error('[botStatus]', err));
}

const logWebhookCache = new Map<string, WebhookClient>();

export async function sendLog(guild: Guild, channelId: string, embed: EmbedBuilder): Promise<void> {
	const channel = guild.channels.cache.get(channelId);
	if (!channel || channel.type !== ChannelType.GuildText) return;

	const textChannel = channel as TextChannel;
	let client = logWebhookCache.get(channelId);

	if (!client) {
		const webhooks = await textChannel.fetchWebhooks().catch(() => null);
		const existing = webhooks?.find((wh) => wh.applicationId === guild.client.application?.id && wh.token);

		if (existing?.token) {
			client = new WebhookClient({ id: existing.id, token: existing.token });
		} else {
			const created = await textChannel
				.createWebhook({
					name: 'HypnoBot Logs',
					avatar: guild.client.user?.displayAvatarURL(),
				})
				.catch(() => null);
			if (!created?.token) return;
			client = new WebhookClient({ id: created.id, token: created.token });
		}
		logWebhookCache.set(channelId, client);
	}

	await client.send({ embeds: [embed] }).catch(() => null);
}

let presenceDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export function updatePresence(client: Client): void {
	if (presenceDebounceTimer) clearTimeout(presenceDebounceTimer);
	presenceDebounceTimer = setTimeout(() => {
		presenceDebounceTimer = null;
		const memberCount = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
		client.user?.setPresence({
			activities: [{ name: `Watching over ${memberCount} members | v${version}` }],
			status: 'online',
		});
	}, 2000);
}
