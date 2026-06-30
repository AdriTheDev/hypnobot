import { Rcon } from 'rcon-client';
import { prisma } from './prisma';

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

export async function applyMcModAction(
	guildId: string,
	userId: string,
	action: 'ban' | 'kick' | 'suspend' | 'unban' | 'unsuspend',
	reason = 'No reason provided',
): Promise<string | null> {
	const entry = await prisma.minecraftWhitelist.findUnique({
		where: { userId_guildId: { userId, guildId } },
	});
	if (!entry) return null;

	const name = entry.minecraftUsername;

	if (action === 'ban') {
		await rconCommand(`ban ${name} ${reason}`);
		await rconCommand(`whitelist remove ${name}`);
	} else if (action === 'kick') {
		await rconCommand(`kick ${name} ${reason}`);
	} else if (action === 'suspend') {
		await rconCommand(`kick ${name} ${reason}`);
		await rconCommand(`whitelist remove ${name}`);
	} else if (action === 'unban') {
		await rconCommand(`pardon ${name}`);
		await rconCommand(`whitelist add ${name}`);
	} else if (action === 'unsuspend') {
		await rconCommand(`whitelist add ${name}`);
	}

	return name;
}

export async function fetchMojangProfile(username: string): Promise<{ id: string; name: string } | null> {
	const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`);
	if (res.status !== 200) return null;
	return res.json() as Promise<{ id: string; name: string }>;
}
