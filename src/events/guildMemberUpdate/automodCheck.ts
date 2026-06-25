import type { GuildMember, PartialGuildMember } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { runAutomodCheck } from '../../lib/automodUtils';

const event: EventFile = {
	async execute(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
		const added = newMember.roles.cache.filter((r) => !oldMember.roles.cache.has(r.id));
		if (!added.size) return;

		await runAutomodCheck(newMember);
	},
};

export default event;
