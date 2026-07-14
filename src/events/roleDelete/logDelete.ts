import { Role, EmbedBuilder, AuditLogEvent } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { sendLog } from '../../lib/botStatus';
import { fetchAuditExecutor } from '../../lib/modUtils';

const event: EventFile = {
	async execute(role: Role) {
		const config = await prisma.guildConfig.findUnique({ where: { guildId: role.guild.id } });
		if (!config?.serverLogChannel) return;

		const executor = await fetchAuditExecutor(role.guild, AuditLogEvent.RoleDelete, role.id);

		const embed = new EmbedBuilder()
			.setTitle('Role Deleted')
			.setColor(0xff6961)
			.addFields(
				{ name: 'Name', value: role.name, inline: true },
				{ name: 'ID', value: `\`${role.id}\``, inline: true },
				{ name: 'Color', value: role.hexColor, inline: true },
			)
			.setTimestamp();

		if (executor) {
			embed.addFields({ name: 'By', value: `${executor} (\`${executor.id}\`)`, inline: true });
		}

		await sendLog(role.guild, config.serverLogChannel, embed);
	},
};

export default event;
