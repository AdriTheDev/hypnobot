import { prisma } from '../src/lib/prisma';

const warnings = [
	// { userId: '', guildId: '', moderatorId: '', reason: '', createdAt: new Date('') },
	{
		userId: '1455642232961896459',
		guildId: '1451972468758544508',
		moderatorId: '924496231231782993',
		reason: 'Purposely disregarding important safe use information of a file and further posting to contact you directly afterwards the subject has been under the influence. If you feel either of these warnings require more looking into, feel free to reach out.',
		createdAt: new Date('2026-05-28T06:59:15Z'),
	},
	{
		userId: '1455642232961896459',
		guildId: '1451972468758544508',
		moderatorId: '924496231231782993',
		reason: "Posting another creator's content as your own.",
		createdAt: new Date('2026-05-28T06:55:55Z'),
	},
	{
		userId: '1463681023286968492',
		guildId: '1451972468758544508',
		moderatorId: '1193695042230026301',
		reason: "Posting politically motivated content in channels where it isn't being discussed.",
		createdAt: new Date('2026-04-24T17:44:58Z'),
	},
	{
		userId: '1466986797623148682',
		guildId: '1451972468758544508',
		moderatorId: '1193695042230026301',
		reason: 'Spamming blank characters in messages.',
		createdAt: new Date('2026-04-16T18:03:10Z'),
	},
	{
		userId: '1088217856333848616',
		guildId: '1451972468758544508',
		moderatorId: '1193695042230026301',
		reason: 'Making transphobic comments. While it is about yourself and during a vent, as per the vent channel and server rules, transphobic coments are not permitted.',
		createdAt: new Date('2026-04-16T15:22:15Z'),
	},
	{
		userId: '1487049284355362867',
		guildId: '1451972468758544508',
		moderatorId: '1193695042230026301',
		reason: 'Spreading misinformation regarding hypnosis after being verbally warned.',
		createdAt: new Date('2026-04-13T16:53:20Z'),
	},
];

const result = await prisma.warning.createMany({ data: warnings });
console.log(`Imported ${result.count} warnings.`);
await prisma.$disconnect();
