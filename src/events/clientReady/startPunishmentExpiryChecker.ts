import type { Client } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { startPunishmentExpiryPoller } from '../../lib/punishmentSchedulers';

const event: EventFile = {
	once: true,
	async execute(client: Client) {
		startPunishmentExpiryPoller(client);
	},
};

export default event;
