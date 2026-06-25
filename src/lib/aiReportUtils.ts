import { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';

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
	auto_deleted: 'AI Media Auto-Removed',
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
		.setFooter({ text: `Report ID: ${report.id}` })
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
