import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import type { ExtendedClient, Command } from './lib/types';
import { loadCommands } from './handlers/commandHandler';
import { loadEvents } from './handlers/eventHandler';
import dotenv from 'dotenv';

dotenv.config();

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

(async () => {
	await loadCommands(client);
	loadEvents(client);
	await client.login(process.env.DISCORD_TOKEN);
})();
