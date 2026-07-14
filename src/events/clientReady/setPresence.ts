import type { Client } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { updatePresence } from '../../lib/botStatus';

const event: EventFile = {
	once: true,
	execute(client: Client) {
		updatePresence(client);
	},
};

export default event;
