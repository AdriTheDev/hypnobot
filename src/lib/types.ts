import {
	AutocompleteInteraction,
	ChatInputCommandInteraction,
	Client,
	Collection,
	MessageContextMenuCommandInteraction,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
	RESTPostAPIContextMenuApplicationCommandsJSONBody,
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

export interface ContextMenuCommand {
	data: {
		name: string;
		toJSON(): RESTPostAPIContextMenuApplicationCommandsJSONBody;
	};
	deleted?: boolean;
	execute(interaction: MessageContextMenuCommandInteraction, client: ExtendedClient): Promise<void>;
}

export interface EventFile {
	once?: boolean;
	execute(...args: unknown[]): Promise<void> | void;
}

export interface ExtendedClient extends Client {
	commands: Collection<string, Command>;
	contextMenuCommands: Collection<string, ContextMenuCommand>;
	cooldowns: Collection<string, Collection<string, number>>;
}
