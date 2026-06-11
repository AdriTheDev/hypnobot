import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import type { ExtendedClient, Command } from './lib/types';
import { loadCommands } from './handlers/commandHandler';
import { loadEvents } from './handlers/eventHandler';
import { logStatus } from './lib/statusWebhook';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const client = new Client({
	intents: [
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.GuildExpressions,
		GatewayIntentBits.GuildIntegrations,
		GatewayIntentBits.GuildInvites,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildModeration,
		GatewayIntentBits.GuildPresences,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildWebhooks,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.MessageContent,
	],
	partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.User],
}) as ExtendedClient;

client.commands = new Collection<string, Command>();
client.cooldowns = new Collection<string, Collection<string, number>>();

const shutdown = async (signal: string) => {
	console.log(`[${signal}] Shutting down...`);
	await logStatus('Bot Stopped', `Received \`${signal}\` — shutting down.`, 0xff6961);
	client.destroy();
	process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

(async () => {
	await loadCommands(client);
	await loadEvents(client);
	await client.login(process.env.DISCORD_TOKEN);
})();
