import { Client, GatewayIntentBits } from 'discord.js';
import { prisma } from '../src/lib/prisma';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once('ready', async () => {
	console.log(`Logged in as ${client.user!.tag}`);

	let totalDeleted = 0;

	for (const [, guild] of client.guilds.cache) {
		console.log(`Processing guild: ${guild.name} (${guild.id})`);

		const members = await guild.members.fetch().catch(() => null);
		if (!members) {
			console.warn(`  Could not fetch members for ${guild.name}, skipping.`);
			continue;
		}

		const memberIds = new Set(members.keys());

		const records = await prisma.userLevel.findMany({
			where: { guildId: guild.id },
			select: { id: true, userId: true },
		});

		const toDelete = records.filter((r) => !memberIds.has(r.userId)).map((r) => r.id);

		if (toDelete.length > 0) {
			await prisma.userLevel.deleteMany({ where: { id: { in: toDelete } } });
			console.log(`  Deleted ${toDelete.length} record(s) for former members.`);
			totalDeleted += toDelete.length;
		} else {
			console.log(`  No stale records found.`);
		}
	}

	console.log(`\nDone. Total records deleted: ${totalDeleted}`);
	await prisma.$disconnect();
	client.destroy();
	process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
