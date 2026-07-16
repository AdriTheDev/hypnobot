import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import type { ExtendedClient, Command, ContextMenuCommand } from './lib/types';
import { loadCommands } from './handlers/commandHandler';
import { loadEvents } from './handlers/eventHandler';
import { logStatus } from './lib/botStatus';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const client = new Client({
	intents: [
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.GuildExpressions,
		GatewayIntentBits.GuildIntegrations,
		GatewayIntentBits.GuildInvites,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildModeration,
		GatewayIntentBits.GuildPresences,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildWebhooks,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.MessageContent,
	],
	partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.User, Partials.Reaction],
}) as ExtendedClient;

client.commands = new Collection<string, Command>();
client.contextMenuCommands = new Collection<string, ContextMenuCommand>();
client.cooldowns = new Collection<string, Collection<string, number>>();
const shutdown = async (signal: string) => {
	console.log(`[${signal}] Shutting down...`);
	await logStatus('Bot Stopped', `Received \`${signal}\`, shutting down.`, 0xff6961);
	client.destroy();
	process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
	const message = reason instanceof Error ? `${reason.message}\n\`\`\`${reason.stack ?? ''}\`\`\`` : String(reason);
	console.error('[unhandledRejection]', reason);
	logStatus('Unhandled Rejection', message.slice(0, 2000), 0xff6961);
});

process.on('uncaughtException', (err) => {
	const message = `${err.message}\n\`\`\`${err.stack ?? ''}\`\`\``;
	console.error('[uncaughtException]', err);
	logStatus('Uncaught Exception', message.slice(0, 2000), 0xff6961);
});

client.on('error', (err) => {
	const message = `${err.message}\n\`\`\`${err.stack ?? ''}\`\`\``;
	console.error('[client error]', err);
	logStatus('Client Error', message.slice(0, 2000), 0xff6961);
});

(async () => {
	await loadCommands(client);
	await loadEvents(client);
	await client.login(process.env.DISCORD_TOKEN);
})();
