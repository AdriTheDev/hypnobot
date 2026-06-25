import { Client, TextChannel } from 'discord.js';
import { prisma } from './prisma';
import { buildReportEmbed, buildReportButtons, REPORT_TIMEOUT_MS } from './aiReportUtils';

async function expireReport(client: Client, reportId: string): Promise<void> {
	const report = await prisma.aiReport.findUnique({ where: { id: reportId } });
	if (!report || report.status !== 'pending') return;

	const updated = await prisma.aiReport.update({
		where: { id: reportId },
		data: { status: 'timed_out', resolvedAt: new Date() },
	});

	if (!updated.logMessageId) return;

	try {
		const config = await prisma.guildConfig.findUnique({ where: { guildId: updated.guildId } });
		if (!config?.aiReportChannel) return;

		const guild = await client.guilds.fetch(updated.guildId).catch(() => null);
		if (!guild) return;

		const channel =
			guild.channels.cache.get(config.aiReportChannel) ??
			(await guild.channels.fetch(config.aiReportChannel).catch(() => null));
		if (!channel?.isTextBased()) return;

		const logMessage = await (channel as TextChannel).messages.fetch(updated.logMessageId).catch(() => null);
		if (!logMessage) return;

		const author = await client.users.fetch(updated.authorId).catch(() => null);
		const embed = buildReportEmbed({ ...updated, authorAvatarUrl: author?.displayAvatarURL() });
		const row = buildReportButtons(updated.id, true);
		await logMessage.edit({ embeds: [embed], components: [row] });
	} catch {
		// guild, channel, or message may no longer exist
	}
}

export function scheduleAiReport(client: Client, reportId: string, createdAt: Date): void {
	const expiresAt = new Date(createdAt.getTime() + REPORT_TIMEOUT_MS);
	const delay = Math.max(0, expiresAt.getTime() - Date.now());
	setTimeout(() => expireReport(client, reportId), delay);
}

export async function initAiReportScheduler(client: Client): Promise<void> {
	const reports = await prisma.aiReport.findMany({ where: { status: 'pending' } });
	const cutoff = new Date(Date.now() - REPORT_TIMEOUT_MS);

	const expired = reports.filter((r) => r.createdAt <= cutoff);
	const pending = reports.filter((r) => r.createdAt > cutoff);

	await Promise.all(expired.map((r) => expireReport(client, r.id)));
	for (const r of pending) scheduleAiReport(client, r.id, r.createdAt);
}
