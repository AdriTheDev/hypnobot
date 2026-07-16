import { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, Client, TextChannel } from 'discord.js';
import { prisma } from './prisma';
import { applyPunishment } from './moderationActions';

export const AUTO_DELETE_THRESHOLD = 4;
export const MOD_VOTE_THRESHOLD = 2;
export const REPORT_TIMEOUT_MS = 24 * 60 * 60 * 1000;

type AiReportData = {
	id: string;
	messageUrl: string;
	authorId: string;
	reporterIds: string[];
	aiVoters: string[];
	notAiVoters: string[];
	status: string;
	createdAt: Date;
	authorAvatarUrl?: string;
};

const STATUS_TITLES: Record<string, string> = {
	pending: 'AI Media Reported',
	confirmed: 'AI Media Confirmed',
	dismissed: 'AI Media Dismissed',
	auto_deleted: 'AI Media Removed',
	timed_out: 'AI Media Report Expired',
};

const STATUS_COLORS: Record<string, number> = {
	pending: 0xff8c00,
	confirmed: 0xff6961,
	dismissed: 0x77dd77,
	auto_deleted: 0xff6961,
	timed_out: 0x9b9b9b,
};

export function buildReportEmbed(report: AiReportData): EmbedBuilder {
	const reporters =
		report.reporterIds.length > 0
			? report.reporterIds
					.slice(0, 10)
					.map((id) => `<@${id}>`)
					.join(', ') + (report.reporterIds.length > 10 ? ` +${report.reporterIds.length - 10} more` : '')
			: '*None*';

	const aiVoters = report.aiVoters.length > 0 ? report.aiVoters.map((id) => `<@${id}>`).join(', ') : '*None*';
	const notAiVoters = report.notAiVoters.length > 0 ? report.notAiVoters.map((id) => `<@${id}>`).join(', ') : '*None*';

	const embed = new EmbedBuilder()
		.setTitle(STATUS_TITLES[report.status] ?? 'AI Media Report')
		.setColor(STATUS_COLORS[report.status] ?? 0xff8c00)
		.addFields(
			{ name: 'Reported Message', value: `[Jump to Message](${report.messageUrl})`, inline: true },
			{ name: 'Author', value: `<@${report.authorId}> (\`${report.authorId}\`)`, inline: true },
			{ name: '​', value: '​', inline: true },
			{ name: `Member Reports (${report.reporterIds.length}/${AUTO_DELETE_THRESHOLD})`, value: reporters },
			{ name: `AI Votes (${report.aiVoters.length}/${MOD_VOTE_THRESHOLD})`, value: aiVoters, inline: true },
			{ name: `Not AI Votes (${report.notAiVoters.length}/${MOD_VOTE_THRESHOLD})`, value: notAiVoters, inline: true },
		)
		.setTimestamp(report.createdAt);

	if (report.authorAvatarUrl) {
		embed.setThumbnail(report.authorAvatarUrl);
	}

	return embed;
}

export function buildReportButtons(reportId: string, disabled: boolean): ActionRowBuilder<ButtonBuilder> {
	return new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId(`ai_report:confirm:${reportId}`)
			.setLabel('Confirm AI')
			.setEmoji('✅')
			.setStyle(ButtonStyle.Success)
			.setDisabled(disabled),
		new ButtonBuilder()
			.setCustomId(`ai_report:deny:${reportId}`)
			.setLabel('Not AI')
			.setEmoji('❌')
			.setStyle(ButtonStyle.Danger)
			.setDisabled(disabled),
	);
}

export async function warnConfirmedAiAuthor(
	client: Client,
	report: { guildId: string; authorId: string; messageUrl: string },
): Promise<void> {
	const guild = await client.guilds.fetch(report.guildId).catch(() => null);
	if (!guild) return;

	const author = await client.users.fetch(report.authorId).catch(() => null);
	if (!author) return;

	const member = await guild.members.fetch(report.authorId).catch(() => null);

	const result = await applyPunishment({
		action: 'warn',
		guild,
		targetUser: author,
		targetMember: member,
		moderator: { user: client.user!, member: null },
		reason: `Posting AI-generated media is not allowed. Your message (${report.messageUrl}) was reviewed and confirmed as AI-generated content by the moderation team.`,
		titlePrefix: '[AUTO] ',
	});

	if (!result.ok) {
		console.error(`[aiReportUtils] Failed to warn ${report.authorId} in ${report.guildId} for confirmed AI content: ${result.failureMessage}`);
	}
}

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
			guild.channels.cache.get(config.aiReportChannel) ?? (await guild.channels.fetch(config.aiReportChannel).catch(() => null));
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
