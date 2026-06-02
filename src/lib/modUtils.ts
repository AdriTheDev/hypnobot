import { EmbedBuilder, Guild, User, TextChannel } from 'discord.js';
import type { ColorResolvable } from 'discord.js';
import { prisma } from './prisma';

type PunishmentAction = 'kick' | 'ban' | 'mute' | 'warn' | 'unmute';

const ACTION_VERB: Record<PunishmentAction, string> = {
	kick: 'kicked from',
	ban: 'banned from',
	mute: 'muted in',
	warn: 'warned in',
	unmute: 'unmuted in',
};

const ACTION_EMOJI: Record<PunishmentAction, string> = {
	kick: '👢',
	ban: '🔨',
	mute: '🔇',
	warn: '⚠️',
	unmute: '🔊',
};

const ACTION_COLOR: Record<PunishmentAction, number> = {
	kick: 0xff6961,
	ban: 0xff6961,
	mute: 0xff6961,
	warn: 0xffc067,
	unmute: 0x77dd77,
};

export async function resolveReason(guildId: string, type: string, text: string): Promise<string> {
	const aliases = await prisma.guildAlias.findMany({
		where: {
			guildId,
			name: { equals: text, mode: 'insensitive' },
			type: { in: [type, 'global'] },
		},
	});
	return aliases.find((a) => a.type === type)?.value ?? aliases.find((a) => a.type === 'global')?.value ?? text;
}

export function buildModEmbed(options: {
	action: string;
	target: User;
	moderator: User;
	reason: string;
	duration?: string;
	color?: ColorResolvable;
}): EmbedBuilder {
	const embed = new EmbedBuilder()
		.setTitle(options.action)
		.setColor(options.color ?? 0xff6961)
		.setThumbnail(options.target.displayAvatarURL())
		.addFields(
			{
				name: 'User',
				value: `${options.target} (\`${options.target.id}\`)`,
				inline: true,
			},
			{ name: 'Moderator', value: `${options.moderator} (\`${options.moderator.id}\`)`, inline: true },
			{ name: 'Reason', value: options.reason },
		)
		.setTimestamp();

	if (options.duration) {
		embed.addFields({
			name: 'Duration',
			value: options.duration,
			inline: true,
		});
	}

	return embed;
}

export async function sendPunishmentDM(
	user: User,
	options: {
		action: PunishmentAction;
		guildName: string;
		reason: string;
		duration?: string;
		warningId?: string;
	},
): Promise<boolean> {
	const lines = [`**Reason:** ${options.reason}`];
	if (options.duration) lines.push(`**Duration:** ${options.duration}`);
	if (options.warningId) lines.push(`**Warning ID:** \`${options.warningId}\``);

	const emoji = ACTION_EMOJI[options.action];
	const verb = ACTION_VERB[options.action];

	const embed = new EmbedBuilder()
		.setTitle(`${emoji} You have been ${verb} ${options.guildName}`)
		.setDescription(lines.join('\n'))
		.setColor(ACTION_COLOR[options.action])
		.setTimestamp();

	try {
		await user.send({ embeds: [embed] });
		return true;
	} catch {
		return false;
	}
}

export async function sendModLog(guild: Guild, embed: EmbedBuilder): Promise<void> {
	const config = await prisma.guildConfig.findUnique({
		where: { guildId: guild.id },
	});
	if (!config?.modLogChannel) return;
	const channel = guild.channels.cache.get(config.modLogChannel);
	if (!channel?.isTextBased()) return;
	await (channel as TextChannel).send({ embeds: [embed] }).catch(() => null);
}

export async function sendPublicModLog(guild: Guild, embed: EmbedBuilder): Promise<void> {
	const config = await prisma.guildConfig.findUnique({
		where: { guildId: guild.id },
	});
	if (!config?.publicModLogChannel) return;
	const channel = guild.channels.cache.get(config.publicModLogChannel);
	if (!channel?.isTextBased()) return;

	const data = embed.toJSON();
	const publicEmbed = new EmbedBuilder(data)
		.spliceFields(
			0,
			data.fields?.length ?? 0,
			...(data.fields?.filter((f) => f.name !== 'Moderator') ?? []),
		)
		.setFooter(null);

	await (channel as TextChannel).send({ embeds: [publicEmbed] }).catch(() => null);
}
