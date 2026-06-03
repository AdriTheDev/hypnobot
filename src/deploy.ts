import 'dotenv/config';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { REST, Routes } from 'discord.js';
import type { Command } from './lib/types';

const __dirname = dirname(fileURLToPath(import.meta.url));

const token = process.env.DISCORD_TOKEN!;
const clientId = process.env.CLIENT_ID!;
const devMode = process.env.DEV_MODE === 'true';
const devGuildId = process.env.DEV_GUILD_ID;

const commandsPath = join(__dirname, 'commands');
const categories = readdirSync(commandsPath, { withFileTypes: true })
	.filter((d) => d.isDirectory())
	.map((d) => d.name);

const toRegister: ReturnType<Command['data']['toJSON']>[] = [];

for (const category of categories) {
	const categoryPath = join(commandsPath, category);
	const files = readdirSync(categoryPath).filter((f) => f.endsWith('.js') || (f.endsWith('.ts') && !f.endsWith('.d.ts')));

	for (const file of files) {
		const filePath = join(categoryPath, file);
		const mod = (await import(pathToFileURL(filePath).href)) as { default?: Command } & Command;
		const command: Command = mod.default ?? mod;

		if (!('data' in command) || !('execute' in command)) continue;
		if (command.deleted) {
			console.log(`Skipping deleted command: ${command.data.name}`);
			continue;
		}

		toRegister.push(command.data.toJSON());
	}
}

const rest = new REST({ version: '10' }).setToken(token);
const route = devMode && devGuildId ? Routes.applicationGuildCommands(clientId, devGuildId) : Routes.applicationCommands(clientId);

const existing = (await rest.get(route)) as Record<string, unknown>[];
const incomingMap = new Map(toRegister.map((c) => [c.name, JSON.stringify(c)]));
const existingMap = new Map(
	existing.map((c) => {
		const incoming = toRegister.find((b) => b.name === c.name);
		const normalized = incoming ? Object.fromEntries(Object.keys(incoming).map((k) => [k, c[k]])) : c;
		return [c.name as string, JSON.stringify(normalized)];
	}),
);

for (const cmd of toRegister) {
	if (!existingMap.has(cmd.name)) {
		console.log(`Added   /${cmd.name}`);
	} else if (existingMap.get(cmd.name) !== incomingMap.get(cmd.name)) {
		console.log(`Edited  /${cmd.name}`);
	} else {
		console.log(`Unchanged /${cmd.name}`);
	}
}

for (const cmd of existing) {
	if (!incomingMap.has(cmd.name as string)) {
		console.log(`Deleted /${cmd.name}`);
	}
}

await rest.put(route, { body: toRegister });
console.log(`\nDeployed ${toRegister.length} command(s) ${devMode && devGuildId ? 'to dev guild' : 'globally'}.`);
