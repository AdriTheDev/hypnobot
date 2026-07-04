import { Colors, EmbedBuilder, Guild, GuildMember, Role, User } from 'discord.js';
import ms from 'ms';
import { prisma } from './prisma';
import { buildModEmbed, getLinkedAccounts, sendModLog, sendPublicModLog, sendPunishmentDM } from './modUtils';
import { applyMcModAction } from './mcRcon';
import { scheduleSuspension } from './suspendScheduler';
import { scheduleTempBan } from './tempBanScheduler';

export type PunishmentKind = 'warn' | 'kick' | 'ban' | 'mute' | 'suspend';
export type ReversalKind = 'unmute' | 'unsuspend' | 'unban';
export type ModerationActionKind = PunishmentKind | ReversalKind;

export const DEFAULT_SUSPENSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
export const WARN_AUTOBAN_THRESHOLD = 4;

const WARN_AUTOBAN_REASON =
	'This is an automated ban as you have received 4 or more warnings against your account. If you believe this is a mistake or you wish to appeal it, visit https://appeal.gg/2BtqX2ZhCg';

export interface ModeratorContext {
	user: User;
	member: GuildMember | null;
}

export interface AltOutcome {
	userId: string;
	status: 'applied' | 'skipped';
	skipReason?: string;
	mcResult?: string | null;
	mcReachable?: boolean;
	dmSent?: boolean;
}

export interface ApplyPunishmentParams {
	action: PunishmentKind;
	guild: Guild;
	targetUser: User;
	targetMember: GuildMember | null;
	moderator: ModeratorContext;
	reason: string;
	durationMs?: number;
	cascadeToAlts?: boolean;
	sendDm?: boolean;
	titlePrefix?: string;
}

export interface ApplyPunishmentResult {
	ok: boolean;
	failureMessage?: string;
	embed?: EmbedBuilder;
	dmSent?: boolean;
	mcResult?: string | null;
	mcReachable?: boolean;
	extra?: Record<string, unknown>;
	altOutcomes: AltOutcome[];
}

export interface ReversePunishmentParams {
	action: ReversalKind;
	guild: Guild;
	targetUser: User;
	targetMember: GuildMember | null;
	moderator: ModeratorContext;
	reason: string;
	cascadeToAlts?: boolean;
	sendDm?: boolean;
}

export interface ReversePunishmentResult {
	ok: boolean;
	failureMessage?: string;
	embed?: EmbedBuilder;
	dmSent?: boolean;
	mcResult?: string | null;
	mcReachable?: boolean;
	altOutcomes: AltOutcome[];
}

export interface PermissionCheckParams {
	action: ModerationActionKind;
	guild: Guild;
	moderatorMember: GuildMember | null;
	target: GuildMember | null;
	targetUser: User;
	isAlt?: boolean;
}

export type PermissionCheckResult = { ok: true } | { ok: false; message: string };

type McAction = 'ban' | 'kick' | 'suspend' | 'unban' | 'unsuspend';
type DmAction = 'kick' | 'ban' | 'mute' | 'warn' | 'unmute' | 'suspend' | 'unsuspend';

const ACTION_VERB: Record<ModerationActionKind, string> = {
	warn: 'warn',
	kick: 'kick',
	ban: 'ban',
	mute: 'mute',
	suspend: 'suspend',
	unmute: 'unmute',
	unsuspend: 'unsuspend',
	unban: 'unban',
};

const ACTION_TITLE: Record<ModerationActionKind, string> = {
	warn: 'Member Warned',
	kick: 'Member Kicked',
	ban: 'Member Banned',
	mute: 'Member Muted',
	suspend: 'Member Suspended',
	unmute: 'Member Unmuted',
	unsuspend: 'Member Unsuspended',
	unban: 'Member Unbanned',
};

const ACTION_ALT_TITLE: Record<ModerationActionKind, string> = {
	warn: 'Member Warned (Alt)',
	kick: 'Member Kicked (Alt)',
	ban: 'Member Banned (Alt)',
	mute: 'Member Muted (Alt)',
	suspend: 'Member Suspended (Alt)',
	unmute: 'Member Unmuted (Alt)',
	unsuspend: 'Member Unsuspended (Alt)',
	unban: 'Member Unbanned (Alt)',
};

const ACTION_COLOR: Record<ModerationActionKind, number> = {
	warn: 0xffc067,
	kick: 0xff6961,
	ban: 0xff6961,
	mute: Colors.Orange,
	suspend: 0xff6961,
	unmute: 0x77dd77,
	unsuspend: 0x77dd77,
	unban: 0x77dd77,
};

const VC_DISCONNECT_ACTIONS = new Set<ModerationActionKind>(['mute', 'suspend']);

const MEMBER_REQUIRED_ACTIONS = new Set<ModerationActionKind>(['kick', 'mute', 'suspend', 'unmute', 'unsuspend']);

const MC_ACTION_MAP: Partial<Record<ModerationActionKind, McAction>> = {
	kick: 'kick',
	ban: 'ban',
	suspend: 'suspend',
	unsuspend: 'unsuspend',
	unban: 'unban',
};

const DM_ACTION_MAP: Partial<Record<ModerationActionKind, DmAction>> = {
	kick: 'kick',
	ban: 'ban',
	mute: 'mute',
	suspend: 'suspend',
	unmute: 'unmute',
	unsuspend: 'unsuspend',
};

const MC_NOTE: Record<McAction, (name: string) => string> = {
	kick: (name) => `Also kicked from Minecraft as \`${name}\`.`,
	ban: (name) => `Also banned from Minecraft as \`${name}\`.`,
	suspend: (name) => `Also kicked and removed from Minecraft whitelist as \`${name}\`.`,
	unsuspend: (name) => `Minecraft whitelist restored for \`${name}\`.`,
	unban: (name) => `Minecraft ban also lifted and whitelist restored for \`${name}\`.`,
};

function durationLabel(action: ModerationActionKind, durationMs?: number): string | undefined {
	if (durationMs) return ms(durationMs, { long: true });
	return action === 'ban' ? 'Permanent' : undefined;
}

function checkBotCapability(action: ModerationActionKind, member: GuildMember): PermissionCheckResult {
	switch (action) {
		case 'kick':
			return member.kickable ? { ok: true } : { ok: false, message: 'I do not have permission to kick that member.' };
		case 'ban':
			return member.bannable ? { ok: true } : { ok: false, message: 'I do not have permission to ban that member.' };
		case 'mute':
		case 'unmute':
			return member.moderatable ? { ok: true } : { ok: false, message: 'I do not have permission to timeout that member.' };
		case 'suspend':
		case 'unsuspend':
			return member.manageable ? { ok: true } : { ok: false, message: "I do not have permission to manage that member's roles." };
		case 'warn':
		case 'unban':
			return { ok: true };
	}
}

export function checkModerationPermissions(params: PermissionCheckParams): PermissionCheckResult {
	const { action, guild, moderatorMember, target, targetUser, isAlt = false } = params;
	const verb = ACTION_VERB[action];

	if (!isAlt) {
		if (moderatorMember && targetUser.id === moderatorMember.user.id) {
			return { ok: false, message: `You cannot ${verb} yourself.` };
		}
		if (targetUser.id === guild.client.user!.id) {
			return { ok: false, message: `You cannot ${verb} me.` };
		}
		if (targetUser.id === guild.ownerId) {
			return { ok: false, message: `You cannot ${verb} the server owner.` };
		}
	}

	if (!target && MEMBER_REQUIRED_ACTIONS.has(action)) {
		return { ok: false, message: 'That user is not in this server.' };
	}

	if (target) {
		if (moderatorMember && target.roles.highest.position >= moderatorMember.roles.highest.position) {
			return { ok: false, message: `You cannot ${verb} someone with an equal or higher role.` };
		}
		const capability = checkBotCapability(action, target);
		if (!capability.ok) return capability;
	}

	return { ok: true };
}

interface ActionContext {
	guild: Guild;
	targetUser: User;
	targetMember: GuildMember | null;
	reason: string;
	durationMs?: number;
	moderatorId: string;
	isAlt: boolean;
	suspendedRole?: Role;
}

interface ActionOutcome {
	success: boolean;
	skipReason?: string;
	extraFields?: { name: string; value: string; inline?: boolean }[];
	extra?: Record<string, unknown>;
	mcAction: McAction | null;
}

async function performKick(ctx: ActionContext): Promise<ActionOutcome> {
	await ctx.targetMember!.kick(ctx.reason);
	return { success: true, mcAction: 'kick' };
}

async function executeBan(ctx: ActionContext & { deleteMessageSeconds?: number }): Promise<ActionOutcome> {
	await ctx.guild.bans.create(ctx.targetUser.id, {
		reason: ctx.reason,
		deleteMessageSeconds: ctx.deleteMessageSeconds ?? 7 * 86400,
	});

	if (ctx.durationMs) {
		const expiresAt = new Date(Date.now() + ctx.durationMs);
		const ban = await prisma.tempBan.upsert({
			where: { userId_guildId: { userId: ctx.targetUser.id, guildId: ctx.guild.id } },
			create: { userId: ctx.targetUser.id, guildId: ctx.guild.id, reason: ctx.reason, moderatorId: ctx.moderatorId, expiresAt },
			update: { reason: ctx.reason, moderatorId: ctx.moderatorId, expiresAt },
		});
		scheduleTempBan(ctx.guild.client, ban);
	}

	return { success: true, mcAction: 'ban' };
}

async function performBan(ctx: ActionContext): Promise<ActionOutcome> {
	return executeBan(ctx);
}

async function performMute(ctx: ActionContext): Promise<ActionOutcome> {
	await ctx.targetMember!.timeout(ctx.durationMs!, ctx.reason);
	return { success: true, mcAction: null };
}

async function performSuspend(ctx: ActionContext): Promise<ActionOutcome> {
	if (ctx.isAlt) {
		const existing = await prisma.suspendedUser.findUnique({
			where: { userId_guildId: { userId: ctx.targetUser.id, guildId: ctx.guild.id } },
		});
		if (existing) return { success: false, skipReason: 'That member is already suspended.', mcAction: null };
	}

	const roleIds = ctx.targetMember!.roles.cache.filter((r) => r.id !== ctx.guild.id).map((r) => r.id);
	const expiresAt = new Date(Date.now() + ctx.durationMs!);

	const record = await prisma.suspendedUser.create({
		data: {
			userId: ctx.targetUser.id,
			guildId: ctx.guild.id,
			roleIds,
			moderatorId: ctx.moderatorId,
			reason: ctx.reason,
			expiresAt,
		},
	});

	await ctx.targetMember!.roles.set([ctx.suspendedRole!], ctx.reason);
	scheduleSuspension(ctx.guild.client, { ...record, expiresAt });

	return { success: true, mcAction: 'suspend' };
}

async function performUnmute(ctx: ActionContext): Promise<ActionOutcome> {
	await ctx.targetMember!.timeout(null, ctx.reason);
	return { success: true, mcAction: null };
}

async function performUnsuspend(ctx: ActionContext): Promise<ActionOutcome> {
	const suspension = await prisma.suspendedUser.findUnique({
		where: { userId_guildId: { userId: ctx.targetUser.id, guildId: ctx.guild.id } },
	});
	if (!suspension) return { success: false, skipReason: 'That member is not suspended.', mcAction: null };

	const roleIds = suspension.roleIds.filter((id) => ctx.guild.roles.cache.has(id));
	await ctx.targetMember!.roles.set(roleIds, ctx.reason);
	await prisma.suspendedUser.delete({ where: { userId_guildId: { userId: ctx.targetUser.id, guildId: ctx.guild.id } } });

	return { success: true, mcAction: 'unsuspend' };
}

async function performUnban(ctx: ActionContext): Promise<ActionOutcome> {
	const ban = await ctx.guild.bans.fetch(ctx.targetUser.id).catch(() => null);
	if (!ban) return { success: false, skipReason: 'That user is not banned in this server.', mcAction: null };

	await ctx.guild.bans.remove(ctx.targetUser.id, ctx.reason);
	await prisma.tempBan.deleteMany({ where: { userId: ctx.targetUser.id, guildId: ctx.guild.id } });

	return { success: true, mcAction: 'unban' };
}

async function performWarn(ctx: ActionContext): Promise<ActionOutcome> {
	const warning = await prisma.warning.create({
		data: { userId: ctx.targetUser.id, guildId: ctx.guild.id, reason: ctx.reason, moderatorId: ctx.moderatorId },
	});
	const warningCount = await prisma.warning.count({
		where: { userId: ctx.targetUser.id, guildId: ctx.guild.id, deletedAt: null },
	});

	const dmSent = await sendPunishmentDM(ctx.targetUser, {
		action: 'warn',
		guildName: ctx.guild.name,
		reason: ctx.reason,
		warningId: warning.id,
		warningsRemaining: Math.max(0, WARN_AUTOBAN_THRESHOLD - warningCount),
	});

	if (warningCount >= WARN_AUTOBAN_THRESHOLD) {
		await sendPunishmentDM(ctx.targetUser, {
			action: 'ban',
			guildName: ctx.guild.name,
			reason: WARN_AUTOBAN_REASON,
			duration: 'Permanent',
		});

		const banOutcome = await executeBan({
			guild: ctx.guild,
			targetUser: ctx.targetUser,
			targetMember: ctx.targetMember,
			reason: WARN_AUTOBAN_REASON,
			moderatorId: ctx.guild.client.user!.id,
			isAlt: ctx.isAlt,
			deleteMessageSeconds: 0,
		}).catch(() => null);

		if (banOutcome?.success) {
			const banEmbed = buildModEmbed({
				action: ctx.isAlt ? 'Member Banned (Auto, Alt)' : 'Member Banned (Auto)',
				target: ctx.targetUser,
				moderator: ctx.guild.client.user!,
				reason: WARN_AUTOBAN_REASON,
				duration: 'Permanent',
				color: 0xff6961,
			});
			await Promise.all([sendModLog(ctx.guild, banEmbed), sendPublicModLog(ctx.guild, banEmbed)]);
			await applyMcModAction(ctx.guild.id, ctx.targetUser.id, 'ban', WARN_AUTOBAN_REASON).catch(() => null);
		}
	}

	return {
		success: true,
		mcAction: null,
		extraFields: [
			{ name: 'Warning ID', value: `\`${warning.id}\``, inline: true },
			{ name: 'Total Warnings', value: `${warningCount}`, inline: true },
		],
		extra: { warningId: warning.id, warningCount, dmSent },
	};
}

const PUNISHMENT_PERFORMERS: Record<PunishmentKind, (ctx: ActionContext) => Promise<ActionOutcome>> = {
	warn: performWarn,
	kick: performKick,
	ban: performBan,
	mute: performMute,
	suspend: performSuspend,
};

const REVERSAL_PERFORMERS: Record<ReversalKind, (ctx: ActionContext) => Promise<ActionOutcome>> = {
	unmute: performUnmute,
	unsuspend: performUnsuspend,
	unban: performUnban,
};

function buildFooterNotes(input: {
	mcResult: string | null;
	mcReachable: boolean;
	mcAction: McAction | null | undefined;
	dmSent?: boolean;
	altOutcomes: AltOutcome[];
}): string[] {
	const notes: string[] = [];
	if (input.dmSent === false) notes.push('Could not send DM to the user.');

	const appliedAlts = input.altOutcomes.filter((a) => a.status === 'applied');
	if (appliedAlts.length > 0) notes.push(`Also applied to ${appliedAlts.length} linked alt(s).`);

	if (input.mcAction) {
		if (input.mcResult) notes.push(MC_NOTE[input.mcAction](input.mcResult));
		if (!input.mcReachable) notes.push('Could not reach the Minecraft server.');
	}

	return notes;
}

async function cascadeToLinkedAccounts(params: {
	action: ModerationActionKind;
	guild: Guild;
	primaryUserId: string;
	primaryUsername: string;
	moderator: ModeratorContext;
	reason: string;
	durationMs?: number;
	sendDm: boolean;
	titlePrefix: string;
	suspendedRole?: Role;
	perform: (ctx: ActionContext) => Promise<ActionOutcome>;
}): Promise<AltOutcome[]> {
	const altIds = await getLinkedAccounts(params.guild.id, params.primaryUserId);
	const outcomes: AltOutcome[] = [];

	for (const altId of altIds) {
		const altUser = await params.guild.client.users.fetch(altId).catch(() => null);
		if (!altUser) {
			outcomes.push({ userId: altId, status: 'skipped', skipReason: 'could not fetch user' });
			continue;
		}

		const altMember = await params.guild.members.fetch(altId).catch(() => null);

		const permCheck = checkModerationPermissions({
			action: params.action,
			guild: params.guild,
			moderatorMember: params.moderator.member,
			target: altMember,
			targetUser: altUser,
			isAlt: true,
		});
		if (!permCheck.ok) {
			outcomes.push({ userId: altId, status: 'skipped', skipReason: permCheck.message });
			continue;
		}

		const altReason = `[Alt of ${params.primaryUsername}] ${params.reason}`;

		const outcome = await params
			.perform({
				guild: params.guild,
				targetUser: altUser,
				targetMember: altMember,
				reason: altReason,
				durationMs: params.durationMs,
				moderatorId: params.moderator.user.id,
				isAlt: true,
				suspendedRole: params.suspendedRole,
			})
			.catch((err) => {
				console.error(`[moderationActions] alt ${params.action} failed for ${altId}:`, err);
				return null;
			});

		if (!outcome || !outcome.success) {
			outcomes.push({ userId: altId, status: 'skipped', skipReason: outcome?.skipReason ?? 'unexpected error' });
			continue;
		}

		if (altMember && VC_DISCONNECT_ACTIONS.has(params.action) && altMember.voice.channel) {
			await altMember.voice.disconnect(altReason).catch(() => null);
		}

		let mcResult: string | null = null;
		let mcReachable = true;
		const mcAction = MC_ACTION_MAP[params.action];
		if (mcAction) {
			try {
				mcResult = await applyMcModAction(params.guild.id, altId, mcAction, altReason);
			} catch {
				mcReachable = false;
			}
		}

		const altEmbed = buildModEmbed({
			action: `${params.titlePrefix}${ACTION_ALT_TITLE[params.action]}`,
			target: altUser,
			moderator: params.moderator.user,
			reason: altReason,
			duration: durationLabel(params.action, params.durationMs),
			color: ACTION_COLOR[params.action],
		});
		if (outcome.extraFields) altEmbed.addFields(...outcome.extraFields);

		const dmAction = DM_ACTION_MAP[params.action];
		let altDmSent: boolean | undefined;
		if (params.sendDm && dmAction) {
			altDmSent = await sendPunishmentDM(altUser, {
				action: dmAction,
				guildName: params.guild.name,
				reason: altReason,
				duration: durationLabel(params.action, params.durationMs),
			});
		} else if (typeof outcome.extra?.dmSent === 'boolean') {
			altDmSent = outcome.extra.dmSent as boolean;
		}

		const altNotes = buildFooterNotes({ mcResult, mcReachable, mcAction, dmSent: altDmSent, altOutcomes: [] });
		if (altNotes.length) altEmbed.setFooter({ text: altNotes.join(' ') });

		await Promise.all([sendModLog(params.guild, altEmbed), sendPublicModLog(params.guild, altEmbed)]);

		outcomes.push({ userId: altId, status: 'applied', mcResult, mcReachable, dmSent: altDmSent });
	}

	return outcomes;
}

export async function applyPunishment(params: ApplyPunishmentParams): Promise<ApplyPunishmentResult> {
	const {
		action,
		guild,
		targetUser,
		targetMember,
		moderator,
		reason,
		durationMs,
		cascadeToAlts = true,
		sendDm = true,
		titlePrefix = '',
	} = params;

	const permCheck = checkModerationPermissions({ action, guild, moderatorMember: moderator.member, target: targetMember, targetUser });
	if (!permCheck.ok) {
		return { ok: false, failureMessage: permCheck.message, altOutcomes: [] };
	}

	let suspendedRole: Role | undefined;
	if (action === 'suspend') {
		suspendedRole =
			guild.roles.cache.find((r) => r.name === 'Suspended') ??
			(await guild.roles.create({ name: 'Suspended', color: 0x808080, reason: 'Auto-created for suspension system' }));
	}

	const perform = PUNISHMENT_PERFORMERS[action];
	const outcome = await perform({
		guild,
		targetUser,
		targetMember,
		reason,
		durationMs,
		moderatorId: moderator.user.id,
		isAlt: false,
		suspendedRole,
	});

	if (!outcome.success) {
		return { ok: false, failureMessage: outcome.skipReason ?? `Could not ${ACTION_VERB[action]} that member.`, altOutcomes: [] };
	}

	if (targetMember && VC_DISCONNECT_ACTIONS.has(action) && targetMember.voice.channel) {
		await targetMember.voice.disconnect(reason).catch(() => null);
	}

	let mcResult: string | null = null;
	let mcReachable = true;
	const mcAction = MC_ACTION_MAP[action];
	if (mcAction) {
		try {
			mcResult = await applyMcModAction(guild.id, targetUser.id, mcAction, reason);
		} catch {
			mcReachable = false;
		}
	}

	let dmSent: boolean | undefined;
	const dmAction = DM_ACTION_MAP[action];
	if (sendDm && dmAction) {
		dmSent = await sendPunishmentDM(targetUser, {
			action: dmAction,
			guildName: guild.name,
			reason,
			duration: durationLabel(action, durationMs),
		});
	} else if (typeof outcome.extra?.dmSent === 'boolean') {
		dmSent = outcome.extra.dmSent as boolean;
	}

	let altOutcomes: AltOutcome[] = [];
	if (cascadeToAlts) {
		altOutcomes = await cascadeToLinkedAccounts({
			action,
			guild,
			primaryUserId: targetUser.id,
			primaryUsername: targetUser.username,
			moderator,
			reason,
			durationMs,
			sendDm,
			titlePrefix,
			suspendedRole,
			perform,
		});
	}

	const embed = buildModEmbed({
		action: `${titlePrefix}${ACTION_TITLE[action]}`,
		target: targetUser,
		moderator: moderator.user,
		reason,
		duration: durationLabel(action, durationMs),
		color: ACTION_COLOR[action],
	});
	if (outcome.extraFields) embed.addFields(...outcome.extraFields);

	const notes = buildFooterNotes({ mcResult, mcReachable, mcAction, dmSent, altOutcomes });
	if (notes.length) embed.setFooter({ text: notes.join(' ') });

	await Promise.all([sendModLog(guild, embed), sendPublicModLog(guild, embed)]);

	return { ok: true, embed, dmSent, mcResult, mcReachable, altOutcomes, extra: outcome.extra };
}

export async function reversePunishment(params: ReversePunishmentParams): Promise<ReversePunishmentResult> {
	const { action, guild, targetUser, targetMember, moderator, reason, cascadeToAlts = true, sendDm = true } = params;

	const permCheck = checkModerationPermissions({ action, guild, moderatorMember: moderator.member, target: targetMember, targetUser });
	if (!permCheck.ok) {
		return { ok: false, failureMessage: permCheck.message, altOutcomes: [] };
	}

	const perform = REVERSAL_PERFORMERS[action];
	const outcome = await perform({ guild, targetUser, targetMember, reason, moderatorId: moderator.user.id, isAlt: false });

	if (!outcome.success) {
		return { ok: false, failureMessage: outcome.skipReason ?? `Could not ${ACTION_VERB[action]} that member.`, altOutcomes: [] };
	}

	let mcResult: string | null = null;
	let mcReachable = true;
	const mcAction = MC_ACTION_MAP[action];
	if (mcAction) {
		try {
			mcResult = await applyMcModAction(guild.id, targetUser.id, mcAction, reason);
		} catch {
			mcReachable = false;
		}
	}

	let dmSent: boolean | undefined;
	const dmAction = DM_ACTION_MAP[action];
	if (sendDm && dmAction) {
		dmSent = await sendPunishmentDM(targetUser, { action: dmAction, guildName: guild.name, reason });
	}

	let altOutcomes: AltOutcome[] = [];
	if (cascadeToAlts) {
		altOutcomes = await cascadeToLinkedAccounts({
			action,
			guild,
			primaryUserId: targetUser.id,
			primaryUsername: targetUser.username,
			moderator,
			reason,
			sendDm,
			titlePrefix: '',
			perform,
		});
	}

	const embed = buildModEmbed({
		action: ACTION_TITLE[action],
		target: targetUser,
		moderator: moderator.user,
		reason,
		color: ACTION_COLOR[action],
	});

	const notes = buildFooterNotes({ mcResult, mcReachable, mcAction, dmSent, altOutcomes });
	if (notes.length) embed.setFooter({ text: notes.join(' ') });

	await Promise.all([sendModLog(guild, embed), sendPublicModLog(guild, embed)]);

	return { ok: true, embed, dmSent, mcResult, mcReachable, altOutcomes };
}
