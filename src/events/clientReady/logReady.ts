import type { ExtendedClient, EventFile } from '../../lib/types';
import { logStatus } from '../../lib/botStatus';

const event: EventFile = {
	once: true,
	async execute(client: ExtendedClient) {
		const dev = process.env.DEV_MODE === 'true';
		console.log(
			`[Ready] Logged in as ${client.user?.tag} (${dev ? 'DEV' : 'PROD'}) | ${client.commands.size} commands | Node ${process.version}`,
		);
		await logStatus(`Bot Started${dev ? ' (DEV)' : ''}`, `Logged in as **${client.user?.tag}**`, 0x77dd77, [
			{ name: 'Guilds', value: String(client.guilds.cache.size), inline: true },
			{ name: 'Cached Users', value: String(client.users.cache.size), inline: true },
			{ name: 'Commands', value: String(client.commands.size), inline: true },
			{ name: 'Node', value: process.version, inline: true },
			{ name: 'Mode', value: dev ? 'DEV' : 'PROD', inline: true },
		]);
	},
};

export default event;
