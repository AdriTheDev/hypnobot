import { WebhookClient, EmbedBuilder, Guild, ChannelType, TextChannel } from 'discord.js';

const webhookCache = new Map<string, WebhookClient>();

export async function sendLog(guild: Guild, channelId: string, embed: EmbedBuilder): Promise<void> {
	const channel = guild.channels.cache.get(channelId);
	if (!channel || channel.type !== ChannelType.GuildText) return;

	const textChannel = channel as TextChannel;
	let client = webhookCache.get(channelId);

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
		webhookCache.set(channelId, client);
	}

	await client.send({ embeds: [embed] }).catch(() => null);
}
