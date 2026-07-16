import { GuildMember, EmbedBuilder, Collection, Invite } from 'discord.js';
import { prisma } from './prisma';

const DEFAULT_WELCOME_MESSAGE = `Hey {@user}, welcome to the server! We're glad to have you here.\nYou are member \`{membercount}\`.\nMake sure to read the <#1451972624107311124> and introduce yourself in <#1454976402339135589>!`;

const DEFAULT_GOODBYE_MESSAGE = `**{displayname}** has left the server. We now have \`{membercount}\` members.`;

export function resolvePlaceholders(
	template: string,
	member: { id: string; user: { username: string; globalName: string | null } },
	guild: { name: string; memberCount: number },
): string {
	return template
		.replace(/\{@user\}/g, `<@${member.id}>`)
		.replace(/\{username\}/g, member.user.username)
		.replace(/\{displayname\}/g, member.user.globalName ?? member.user.username)
		.replace(/\{membercount\}/g, String(guild.memberCount))
		.replace(/\{server\}/g, guild.name);
}

export async function sendWelcome(member: GuildMember): Promise<void> {
	const config = await prisma.guildConfig.findUnique({ where: { guildId: member.guild.id } });
	if (!config?.welcomeChannel) return;

	const channel = member.guild.channels.cache.get(config.welcomeChannel);
	if (!channel?.isTextBased()) return;

	const description = resolvePlaceholders(config.welcomeMessage ?? DEFAULT_WELCOME_MESSAGE, member, member.guild);

	const embed = new EmbedBuilder()
		.setTitle(`Welcome to ${member.guild.name}!`)
		.setDescription(description)
		.setThumbnail(member.user.displayAvatarURL())
		.setColor(0xfd86f3);

	const message = await channel.send({ content: `${member}`, embeds: [embed] }).catch(() => null);
	if (!message) return;

	await prisma.welcomeMessage.upsert({
		where: { userId_guildId: { userId: member.id, guildId: member.guild.id } },
		create: { userId: member.id, guildId: member.guild.id, channelId: channel.id, messageId: message.id },
		update: { channelId: channel.id, messageId: message.id },
	});
}

export async function assignJoinRoles(member: GuildMember): Promise<void> {
	if (member.user.bot) return;

	const config = await prisma.guildConfig.findUnique({ where: { guildId: member.guild.id } });
	if (!config?.joinRoles.length) return;

	const roles = config.joinRoles.filter((id) => member.guild.roles.cache.has(id));
	if (!roles.length) return;

	for (const roleId of roles) {
		await member.roles.add(roleId).catch(() => null);
	}
}

const inviteCache = new Map<string, Collection<string, number>>();

export function setGuildInvites(guildId: string, invites: Collection<string, Invite>): void {
	inviteCache.set(guildId, new Collection(invites.map((inv) => [inv.code, inv.uses ?? 0])));
}

export function getGuildInvites(guildId: string): Collection<string, number> | undefined {
	return inviteCache.get(guildId);
}

export function setInvite(guildId: string, code: string, uses: number): void {
	const guild = inviteCache.get(guildId) ?? new Collection<string, number>();
	guild.set(code, uses);
	inviteCache.set(guildId, guild);
}

export function deleteInvite(guildId: string, code: string): void {
	inviteCache.get(guildId)?.delete(code);
}
