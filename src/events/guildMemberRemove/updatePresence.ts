import type { GuildMember, PartialGuildMember } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { updatePresence } from '../../lib/updatePresence';

const event: EventFile = {
	execute(member: GuildMember | PartialGuildMember) {
		updatePresence(member.client);
	},
};

export default event;
