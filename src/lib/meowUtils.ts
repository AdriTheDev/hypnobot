export const MEOW_WORDS = ['mrrp', 'meow', 'woof', 'arf', 'awuff', 'mrow', 'awoo', 'ruff'] as const;

export type MeowWord = (typeof MEOW_WORDS)[number];

function collapseRepeats(word: string): string {
	let result = '';
	for (const char of word) {
		if (result[result.length - 1] !== char) result += char;
	}
	return result;
}

function buildWordRegex(word: string): RegExp {
	const pattern = collapseRepeats(word)
		.split('')
		.map((char) => `${char}+`)
		.join('');
	return new RegExp(`\\b${pattern}s?\\b`, 'gi');
}

const WORD_REGEXES = Object.fromEntries(MEOW_WORDS.map((word) => [word, buildWordRegex(word)])) as Record<MeowWord, RegExp>;

export function countMeowWords(content: string): Partial<Record<MeowWord, number>> {
	const counts: Partial<Record<MeowWord, number>> = {};

	for (const word of MEOW_WORDS) {
		const matches = content.match(WORD_REGEXES[word]);
		if (matches && matches.length > 0) counts[word] = matches.length;
	}

	return counts;
}
