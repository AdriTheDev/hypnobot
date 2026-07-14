import { Invite } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { setInvite } from '../../lib/memberActions';

const event: EventFile = {
	execute(invite: Invite) {
		if (!invite.guild) return;
		setInvite(invite.guild.id, invite.code, invite.uses ?? 0);
	},
};

export default event;
