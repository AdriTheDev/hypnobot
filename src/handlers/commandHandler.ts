import { readdirSync } from 'fs';
import { join } from 'path';
import { REST, Routes } from 'discord.js';
import type { Command, ExtendedClient } from '../lib/types';

export async function loadCommands(client: ExtendedClient): Promise<void> {
	const commandsPath = join(__dirname, '..', 'commands');
	const categories = readdirSync(commandsPath, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => d.name);

	const toRegister: Command['data'][] = [];

	for (const category of categories) {
		const categoryPath = join(commandsPath, category);
		const files = readdirSync(categoryPath).filter((f) => f.endsWith('.js') || (f.endsWith('.ts') && !f.endsWith('.d.ts')));

		for (const file of files) {
			const filePath = join(categoryPath, file);
			const mod = require(filePath) as { default?: Command } & Command;
			const command: Command = mod.default ?? mod;

			if (!('data' in command) || !('execute' in command)) {
				console.warn(`[Commands] Skipping ${file} — missing "data" or "execute".`);
				continue;
			}

			if (command.deleted) {
				console.log(`[Commands] Skipping deleted command: ${command.data.name}`);
				continue;
			}

			command.category = category;
			client.commands.set(command.data.name, command);
			toRegister.push(command.data);
			console.log(`[Commands] Loaded /${command.data.name} (${category})`);
		}
	}

	await registerCommands(toRegister);
}

async function registerCommands(commands: Command['data'][]): Promise<void> {
	const token = process.env.DISCORD_TOKEN!;
	const clientId = process.env.CLIENT_ID!;
	const devMode = process.env.DEV_MODE === 'true';
	const devGuildId = process.env.DEV_GUILD_ID;

	const rest = new REST({ version: '10' }).setToken(token);
	const body = commands.map((c) => c.toJSON());

	if (devMode && devGuildId) {
		await rest.put(Routes.applicationGuildCommands(clientId, devGuildId), {
			body,
		});
		console.log(`[Commands] Registered ${body.length} command(s) to dev guild.`);
	} else {
		await rest.put(Routes.applicationCommands(clientId), { body });
		console.log(`[Commands] Registered ${body.length} command(s) globally.`);
	}
}
