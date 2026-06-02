import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import type { EventFile, ExtendedClient } from '../lib/types';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadEvents(client: ExtendedClient): Promise<void> {
	const eventsPath = join(__dirname, '..', 'events');
	const eventFolders = readdirSync(eventsPath, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => d.name);

	for (const eventName of eventFolders) {
		const folderPath = join(eventsPath, eventName);
		const files = readdirSync(folderPath).filter((f) => f.endsWith('.js') || (f.endsWith('.ts') && !f.endsWith('.d.ts')));

		for (const file of files) {
			const filePath = join(folderPath, file);
			const mod = (await import(pathToFileURL(filePath).href)) as {
				default?: EventFile;
			} & EventFile;
			const eventFile: EventFile = mod.default ?? mod;

			if (typeof eventFile.execute !== 'function') {
				console.warn(`[Events] Skipping ${file} — missing "execute".`);
				continue;
			}

			if (eventFile.once) {
				client.once(eventName, (...args) => eventFile.execute(...args));
			} else {
				client.on(eventName, (...args) => eventFile.execute(...args));
			}

			console.log(`[Events] Registered ${eventName}/${file}${eventFile.once ? ' (once)' : ''}`);
		}
	}
}
