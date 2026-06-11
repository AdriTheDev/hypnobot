import { GuildMember } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { assignJoinRoles } from '../../lib/memberActions';

const event: EventFile = {
	async execute(member: GuildMember) {
		if (member.pending) return;
		await assignJoinRoles(member);
	},
};

export default event;
