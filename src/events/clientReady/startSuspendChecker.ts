import type { Client } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { initSuspendScheduler } from '../../lib/suspendScheduler';

const event: EventFile = {
	once: true,
	async execute(client: Client) {
		await initSuspendScheduler(client);
	},
};

export default event;
