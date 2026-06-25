import type { Client } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { initAiReportScheduler } from '../../lib/aiReportScheduler';

const event: EventFile = {
	once: true,
	async execute(client: Client) {
		await initAiReportScheduler(client);
	},
};

export default event;
