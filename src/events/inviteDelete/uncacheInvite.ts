import { Invite } from 'discord.js';
import type { EventFile } from '../../lib/types';
import { deleteInvite } from '../../lib/memberActions';

const event: EventFile = {
	execute(invite: Invite) {
		if (!invite.guild) return;
		deleteInvite(invite.guild.id, invite.code);
	},
};

export default event;
