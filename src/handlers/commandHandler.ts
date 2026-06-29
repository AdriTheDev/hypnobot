import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { ApplicationCommandType } from 'discord.js';
import type { Command, ContextMenuCommand, ExtendedClient } from '../lib/types';

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
			const mod = (await import(pathToFileURL(filePath).href)) as { default?: Command | ContextMenuCommand } & (
				| Command
				| ContextMenuCommand
			);
			const command: Command | ContextMenuCommand = mod.default ?? mod;

			if (!('data' in command) || !('execute' in command)) {
				console.warn(`[Commands] Skipping ${file} - missing "data" or "execute".`);
				continue;
			}

			if (command.deleted) continue;

			const json = command.data.toJSON() as { type?: number };
			if (json.type === ApplicationCommandType.Message || json.type === ApplicationCommandType.User) {
				client.contextMenuCommands.set(command.data.name, command as ContextMenuCommand);
				console.log(`[Commands] Loaded context menu: ${command.data.name} (${category})`);
			} else {
				(command as Command).category = category;
				client.commands.set(command.data.name, command as Command);
				console.log(`[Commands] Loaded /${command.data.name} (${category})`);
			}
		}
	}
}
