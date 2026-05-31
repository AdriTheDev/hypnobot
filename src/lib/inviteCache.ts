import { Collection, Invite } from 'discord.js';

const cache = new Map<string, Collection<string, number>>();

export function setGuildInvites(guildId: string, invites: Collection<string, Invite>): void {
	cache.set(guildId, new Collection(invites.map((inv) => [inv.code, inv.uses ?? 0])));
}

export function getGuildInvites(guildId: string): Collection<string, number> | undefined {
	return cache.get(guildId);
}

export function setInvite(guildId: string, code: string, uses: number): void {
	const guild = cache.get(guildId) ?? new Collection<string, number>();
	guild.set(code, uses);
	cache.set(guildId, guild);
}

export function deleteInvite(guildId: string, code: string): void {
	cache.get(guildId)?.delete(code);
}
