import 'dotenv/config';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { REST, Routes } from 'discord.js';
import type { Command, ContextMenuCommand } from './lib/types';

const __dirname = dirname(fileURLToPath(import.meta.url));

const token = process.env.DISCORD_TOKEN!;
const clientId = process.env.CLIENT_ID!;
const devMode = process.env.DEV_MODE === 'true';
const devGuildId = process.env.DEV_GUILD_ID;

const commandsPath = join(__dirname, 'commands');
const categories = readdirSync(commandsPath, { withFileTypes: true })
	.filter((d) => d.isDirectory())
	.map((d) => d.name);

const toRegister: object[] = [];

for (const category of categories) {
	const categoryPath = join(commandsPath, category);
	const files = readdirSync(categoryPath).filter((f) => f.endsWith('.js') || (f.endsWith('.ts') && !f.endsWith('.d.ts')));

	for (const file of files) {
		const filePath = join(categoryPath, file);
		const mod = (await import(pathToFileURL(filePath).href)) as { default?: Command | ContextMenuCommand } & (
			| Command
			| ContextMenuCommand
		);
		const command: Command | ContextMenuCommand = mod.default ?? mod;

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
type Named = { name: string };
const incomingMap = new Map(toRegister.map((c) => [(c as Named).name, JSON.stringify(c)]));
const existingMap = new Map(
	existing.map((c) => {
		const incoming = toRegister.find((b) => (b as Named).name === c.name);
		const normalized = incoming ? Object.fromEntries(Object.keys(incoming).map((k) => [k, c[k]])) : c;
		return [c.name as string, JSON.stringify(normalized)];
	}),
);

for (const cmd of toRegister) {
	const name = (cmd as Named).name;
	if (!existingMap.has(name)) {
		console.log(`Added   /${name}`);
	} else if (existingMap.get(name) !== incomingMap.get(name)) {
		console.log(`Edited  /${name}`);
	} else {
		console.log(`Unchanged /${name}`);
	}
}

for (const cmd of existing) {
	if (!incomingMap.has(cmd.name as string)) {
		console.log(`Deleted /${cmd.name}`);
	}
}

await rest.put(route, { body: toRegister });
console.log(`\nDeployed ${toRegister.length} command(s) ${devMode && devGuildId ? 'to dev guild' : 'globally'}.`);
