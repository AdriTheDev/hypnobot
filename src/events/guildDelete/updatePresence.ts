import type { Guild } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { updatePresence } from '../../lib/updatePresence';

const event: EventFile = {
	execute(guild: Guild) {
		updatePresence(guild.client);
	},
};

export default event;
