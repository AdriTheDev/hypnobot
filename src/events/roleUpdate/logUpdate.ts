import { Role, EmbedBuilder, AuditLogEvent } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { prisma } from '../../lib/prisma';
import { sendLog } from '../../lib/logWebhook';
import { fetchAuditExecutor } from '../../lib/modUtils';

const event: EventFile = {
	async execute(oldRole: Role, newRole: Role) {
		const changes: { name: string; before: string; after: string }[] = [];

		if (oldRole.name !== newRole.name) {
			changes.push({ name: 'Name', before: oldRole.name, after: newRole.name });
		}

		if (oldRole.color !== newRole.color) {
			changes.push({ name: 'Color', before: oldRole.hexColor, after: newRole.hexColor });
		}

		if (oldRole.hoist !== newRole.hoist) {
			changes.push({ name: 'Hoisted', before: String(oldRole.hoist), after: String(newRole.hoist) });
		}

		if (oldRole.mentionable !== newRole.mentionable) {
			changes.push({ name: 'Mentionable', before: String(oldRole.mentionable), after: String(newRole.mentionable) });
		}

		const oldPerms = oldRole.permissions.toArray();
		const newPerms = newRole.permissions.toArray();
		const addedPerms = newPerms.filter((p) => !oldPerms.includes(p));
		const removedPerms = oldPerms.filter((p) => !newPerms.includes(p));

		if (!changes.length && !addedPerms.length && !removedPerms.length) return;

		const config = await prisma.guildConfig.findUnique({ where: { guildId: newRole.guild.id } });
		if (!config?.serverLogChannel) return;

		const executor = await fetchAuditExecutor(newRole.guild, AuditLogEvent.RoleUpdate, newRole.id);

		const embed = new EmbedBuilder()
			.setTitle('Role Updated')
			.setColor(newRole.color || 0xffc067)
			.addFields({ name: 'Role', value: `${newRole} (\`${newRole.id}\`)` })
			.setTimestamp();

		for (const c of changes) {
			embed.addFields(
				{ name: `${c.name} — Before`, value: c.before, inline: true },
				{ name: `${c.name} — After`, value: c.after, inline: true },
				{ name: '​', value: '​', inline: true },
			);
		}

		if (addedPerms.length) {
			embed.addFields({ name: 'Permissions Added', value: addedPerms.join(', ') });
		}

		if (removedPerms.length) {
			embed.addFields({ name: 'Permissions Removed', value: removedPerms.join(', ') });
		}

		if (executor) {
			embed.addFields({ name: 'By', value: `${executor} (\`${executor.id}\`)`, inline: true });
		}

		await sendLog(newRole.guild, config.serverLogChannel, embed);
	},
};

export default event;
