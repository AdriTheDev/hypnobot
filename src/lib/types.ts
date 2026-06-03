import {
	AutocompleteInteraction,
	ChatInputCommandInteraction,
	Client,
	Collection,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';

export interface Command {
	data: {
		name: string;
		toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody;
	};
	category?: string;
	cooldown?: number;
	ownerOnly?: boolean;
	deleted?: boolean;
	execute(interaction: ChatInputCommandInteraction, client: ExtendedClient): Promise<void>;
	autocomplete?(interaction: AutocompleteInteraction): Promise<void>;
}

export interface EventFile {
	once?: boolean;
	execute(...args: unknown[]): Promise<void> | void;
}

export interface ExtendedClient extends Client {
	commands: Collection<string, Command>;
	cooldowns: Collection<string, Collection<string, number>>;
}
