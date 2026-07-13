import type { GuildMember, PartialGuildMember } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { runAutomodCheck } from '../../lib/automodUtils';

const event: EventFile = {
	async execute(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
		const added = newMember.roles.cache.filter((r) => !oldMember.roles.cache.has(r.id));
		const nicknameChanged = oldMember.nickname !== newMember.nickname;
		if (!added.size && !nicknameChanged) return;

		await runAutomodCheck(newMember);
	},
};

export default event;
