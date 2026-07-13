import { type Interaction, PermissionFlagsBits, TextChannel, GuildMember } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { buildReportEmbed, buildReportButtons, MOD_VOTE_THRESHOLD } from '../../lib/aiReportUtils';
import { botDeletedMessages } from '../../lib/botDeletedMessages';

const event: EventFile = {
	async execute(interaction: Interaction) {
		if (!interaction.isButton()) return;
		if (!interaction.customId.startsWith('ai_report:')) return;

		const [, action, reportId] = interaction.customId.split(':');

		const member = interaction.member as GuildMember;
		if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) {
			await interaction.reply({ content: 'You do not have permission to review AI reports.', ephemeral: true });
			return;
		}

		await interaction.deferUpdate();

		const report = await prisma.aiReport.findUnique({ where: { id: reportId } });
		if (!report) {
			await interaction.followUp({ content: 'This report no longer exists.', ephemeral: true });
			return;
		}

		if (report.status !== 'pending') {
			await interaction.followUp({ content: 'This report has already been resolved.', ephemeral: true });
			return;
		}

		const modId = interaction.user.id;
		let { aiVoters, notAiVoters } = report;

		// Remove from the other side if switching votes
		aiVoters = aiVoters.filter((id) => id !== modId);
		notAiVoters = notAiVoters.filter((id) => id !== modId);

		if (action === 'confirm') {
			aiVoters.push(modId);
		} else {
			notAiVoters.push(modId);
		}

		let status = 'pending';
		let resolvedAt: Date | null = null;
		let resolvedById: string | null = null;

		if (aiVoters.length >= MOD_VOTE_THRESHOLD) {
			status = 'confirmed';
			resolvedAt = new Date();
			resolvedById = modId;

			// Attempt to delete the message
			try {
				const targetChannel = interaction.guild!.channels.cache.get(report.channelId);
				if (targetChannel?.isTextBased()) {
					const targetMessage = await (targetChannel as TextChannel).messages.fetch(report.messageId).catch(() => null);
					if (targetMessage) botDeletedMessages.add(targetMessage.id);
					await targetMessage?.delete().catch(() => {
						if (targetMessage) botDeletedMessages.delete(targetMessage.id);
					});
				}
			} catch {
				// message may already be deleted
			}
		} else if (notAiVoters.length >= MOD_VOTE_THRESHOLD) {
			status = 'dismissed';
			resolvedAt = new Date();
			resolvedById = modId;
		}

		const updated = await prisma.aiReport.update({
			where: { id: reportId },
			data: { aiVoters, notAiVoters, status, resolvedAt, resolvedById },
		});

		const author = await interaction.client.users.fetch(updated.authorId).catch(() => null);
		const embed = buildReportEmbed({ ...updated, authorAvatarUrl: author?.displayAvatarURL() });
		const row = buildReportButtons(reportId, status !== 'pending');

		await interaction.editReply({ embeds: [embed], components: [row] });
	},
};

export default event;
