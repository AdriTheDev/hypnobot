import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import type { Command, ExtendedClient } from '../lib/types';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadCommands(client: ExtendedClient): Promise<void> {
	const commandsPath = join(__dirname, '..', 'commands');
	const categories = readdirSync(commandsPath, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => d.name);

	for (const category of categories) {
		const categoryPath = join(commandsPath, category);
		const files = readdirSync(categoryPath).filter((f) => f.endsWith('.js') || (f.endsWith('.ts') && !f.endsWith('.d.ts')));

		for (const file of files) {
			const filePath = join(categoryPath, file);
			const mod = (await import(pathToFileURL(filePath).href)) as { default?: Command } & Command;
			const command: Command = mod.default ?? mod;

			if (!('data' in command) || !('execute' in command)) {
				console.warn(`[Commands] Skipping ${file} — missing "data" or "execute".`);
				continue;
			}

			if (command.deleted) continue;

			command.category = category;
			client.commands.set(command.data.name, command);
			console.log(`[Commands] Loaded /${command.data.name} (${category})`);
		}
	}
}
