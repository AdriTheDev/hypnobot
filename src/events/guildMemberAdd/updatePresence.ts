import type { GuildMember } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { updatePresence } from '../../lib/botStatus';

const event: EventFile = {
	execute(member: GuildMember) {
		updatePresence(member.client);
	},
};

export default event;
