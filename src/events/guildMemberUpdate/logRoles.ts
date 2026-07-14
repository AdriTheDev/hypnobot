import { GuildMember, PartialGuildMember, EmbedBuilder, AuditLogEvent } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { sendLog } from '../../lib/botStatus';
import { fetchAuditExecutor } from '../../lib/modUtils';

const event: EventFile = {
	async execute(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
		const added = newMember.roles.cache.filter((r) => !oldMember.roles.cache.has(r.id) && r.id !== newMember.guild.id);
		const removed = oldMember.roles.cache.filter((r) => !newMember.roles.cache.has(r.id) && r.id !== newMember.guild.id);
		if (!added.size && !removed.size) return;

		const config = await prisma.guildConfig.findUnique({ where: { guildId: newMember.guild.id } });
		if (!config?.memberLogChannel) return;

		const executor = await fetchAuditExecutor(newMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.id);

		const embed = new EmbedBuilder()
			.setTitle('Roles Updated')
			.setColor(0xb4a7d6)
			.setThumbnail(newMember.user.displayAvatarURL())
			.addFields({ name: 'User', value: `${newMember} (\`${newMember.id}\`)` })
			.setTimestamp();

		if (added.size) embed.addFields({ name: 'Added', value: added.map((r) => r.toString()).join(', '), inline: true });
		if (removed.size) embed.addFields({ name: 'Removed', value: removed.map((r) => r.toString()).join(', '), inline: true });

		if (executor) {
			embed.addFields({ name: 'By', value: `${executor} (\`${executor.id}\`)`, inline: true });
		}

		await sendLog(newMember.guild, config.memberLogChannel, embed);
	},
};

export default event;
