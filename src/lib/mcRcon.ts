import { Rcon } from 'rcon-client';

export async function rconCommand(command: string): Promise<string> {
	const host = process.env.MC_RCON_HOST;
	const password = process.env.MC_RCON_PASSWORD;

	if (!host || !password) throw new Error('MC_RCON_HOST and MC_RCON_PASSWORD must be set.');

	const port = parseInt(process.env.MC_RCON_PORT ?? '25575', 10);
	const rcon = new Rcon({ host, port, password, timeout: 5000 });

	await rcon.connect();
	try {
		return await rcon.send(command);
	} finally {
		await rcon.end();
	}
}

export async function fetchMojangProfile(username: string): Promise<{ id: string; name: string } | null> {
	const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`);
	if (res.status !== 200) return null;
	return res.json() as Promise<{ id: string; name: string }>;
}
