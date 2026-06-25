import { GuildMember, PartialGuildMember, EmbedBuilder } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { sendModLog } from '../../lib/modUtils';

const event: EventFile = {
	async execute(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
		if (newMember.communicationDisabledUntil !== null) return;
		if (oldMember.partial || !oldMember.communicationDisabledUntil) return;

		// Manual unmute (bot command or Discord UI) removes an active timeout - skip
		if (oldMember.communicationDisabledUntil > new Date()) return;

		const embed = new EmbedBuilder()
			.setTitle('Timeout Expired')
			.setColor(0x77dd77)
			.setThumbnail(newMember.user.displayAvatarURL())
			.addFields(
				{ name: 'User', value: `${newMember} (\`${newMember.id}\`)` },
				{ name: 'Expired', value: `<t:${Math.floor(oldMember.communicationDisabledUntil.getTime() / 1000)}:f>` },
			)
			.setTimestamp();

		await sendModLog(newMember.guild, embed);
	},
};

export default event;
