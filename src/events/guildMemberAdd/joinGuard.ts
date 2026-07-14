import { GuildMember } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { runJoinGuardCheck } from '../../lib/joinGuard';

const event: EventFile = {
	async execute(member: GuildMember) {
		if (member.pending) return;
		await runJoinGuardCheck(member);
	},
};

export default event;
