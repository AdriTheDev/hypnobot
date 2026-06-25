import { ContextMenuCommandBuilder, ApplicationCommandType, MessageContextMenuCommandInteraction, TextChannel } from 'discord.js';
import type { ContextMenuCommand } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { buildReportEmbed, buildReportButtons, AUTO_DELETE_THRESHOLD } from '../../lib/aiReportUtils';
import { scheduleAiReport } from '../../lib/aiReportScheduler';

export default {
	data: new ContextMenuCommandBuilder().setName('Report as AI Media').setType(ApplicationCommandType.Message),

	async execute(interaction: MessageContextMenuCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const guildId = interaction.guildId!;
		const config = await prisma.guildConfig.findUnique({ where: { guildId } });

		if (!config?.aiReportChannel) {
			await interaction.editReply('AI media reporting has not been configured for this server.');
			return;
		}

		const logChannel = interaction.guild!.channels.cache.get(config.aiReportChannel);
		if (!logChannel?.isTextBased()) {
			await interaction.editReply('The AI report channel is no longer accessible. Please contact an administrator.');
			return;
		}

		const message = interaction.targetMessage;
		const reporterId = interaction.user.id;

		if (message.author.id === interaction.client.user?.id) {
			await interaction.editReply('You cannot report bot messages.');
			return;
		}

		const existing = await prisma.aiReport.findUnique({
			where: { guildId_messageId: { guildId, messageId: message.id } },
		});

		if (existing) {
			if (existing.status !== 'pending') {
				await interaction.editReply('This message has already been reviewed by moderators.');
				return;
			}
			if (existing.reporterIds.includes(reporterId)) {
				await interaction.editReply('You have already reported this message.');
				return;
			}
		}

		const report = await prisma.aiReport.upsert({
			where: { guildId_messageId: { guildId, messageId: message.id } },
			create: {
				guildId,
				channelId: message.channelId,
				messageId: message.id,
				messageUrl: message.url,
				authorId: message.author.id,
				reporterIds: [reporterId],
				aiVoters: [],
				notAiVoters: [],
			},
			update: {
				reporterIds: { push: reporterId },
			},
		});

		if (!existing) {
			scheduleAiReport(interaction.client, report.id, report.createdAt);
		}

		let finalStatus = report.status;

		if (report.reporterIds.length >= AUTO_DELETE_THRESHOLD && finalStatus === 'pending') {
			try {
				await message.delete();
			} catch {
				// message may already be deleted
			}
			await prisma.aiReport.update({
				where: { id: report.id },
				data: { status: 'auto_deleted', resolvedAt: new Date() },
			});
			finalStatus = 'auto_deleted';
		}

		const reportData = { ...report, status: finalStatus, authorAvatarUrl: message.author.displayAvatarURL() };
		const embed = buildReportEmbed(reportData);
		const row = buildReportButtons(report.id, finalStatus !== 'pending');

		if (report.logMessageId) {
			const logMessage = await (logChannel as TextChannel).messages.fetch(report.logMessageId).catch(() => null);
			if (logMessage) {
				await logMessage.edit({ embeds: [embed], components: [row] });
			} else {
				const newMsg = await (logChannel as TextChannel).send({ embeds: [embed], components: [row] });
				await prisma.aiReport.update({ where: { id: report.id }, data: { logMessageId: newMsg.id } });
			}
		} else {
			const newMsg = await (logChannel as TextChannel).send({ embeds: [embed], components: [row] });
			await prisma.aiReport.update({ where: { id: report.id }, data: { logMessageId: newMsg.id } });
		}

		await interaction.editReply(
			finalStatus === 'auto_deleted'
				? 'This message has been automatically removed after reaching the report threshold. Thank you.'
				: 'Your report has been submitted to the moderation team. Thank you.',
		);
	},
} satisfies ContextMenuCommand;
