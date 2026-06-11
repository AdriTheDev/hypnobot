import { GuildMember, PartialGuildMember } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { sendWelcome, assignJoinRoles } from '../../lib/memberActions';

const event: EventFile = {
	async execute(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember | PartialGuildMember) {
		if (!oldMember.pending || newMember.pending) return;
		await Promise.all([sendWelcome(newMember as GuildMember), assignJoinRoles(newMember as GuildMember)]);
	},
};

export default event;
