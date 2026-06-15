import type { Client } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { initTempBanScheduler } from '../../lib/tempBanScheduler';

const event: EventFile = {
	once: true,
	async execute(client: Client) {
		await initTempBanScheduler(client);
	},
};

export default event;
