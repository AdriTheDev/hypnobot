import type { GuildMember } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { runAutomodCheck } from '../../lib/automodUtils';

const event: EventFile = {
	async execute(member: GuildMember) {
		await runAutomodCheck(member);
	},
};

export default event;
