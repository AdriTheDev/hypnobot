import { WebhookClient, EmbedBuilder } from 'discord.js';

let client: WebhookClient | null = null;

function getClient(): WebhookClient | null {
	if (!process.env.STATUS_WEBHOOK_URL) return null;
	if (!client) client = new WebhookClient({ url: process.env.STATUS_WEBHOOK_URL });
	return client;
}

export async function logStatus(
	title: string,
	description: string,
	color: number,
	fields?: { name: string; value: string; inline?: boolean }[],
): Promise<void> {
	const wh = getClient();
	if (!wh) return;
	const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(color).setTimestamp();
	if (fields?.length) embed.addFields(fields);
	await wh.send({ embeds: [embed] }).catch((err) => console.error('[statusWebhook]', err));
}
