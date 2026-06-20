export function xpForLevel(level: number): number {
	return 5 * level * level + 75 * level + 150;
}

export function totalXPForLevel(level: number): number {
	if (level <= 0) return 0;
	const n = level;
	return Math.round((5 * n * (n - 1) * (2 * n - 1)) / 6 + (75 * n * (n - 1)) / 2 + 150 * n);
}

export function resolveLevel(totalXP: number): {
	level: number;
	currentLevelXP: number;
	requiredXP: number;
} {
	let level = 0;
	let remaining = totalXP;

	while (remaining >= xpForLevel(level)) {
		remaining -= xpForLevel(level);
		level++;
	}

	return { level, currentLevelXP: remaining, requiredXP: xpForLevel(level) };
}

export function randomXP(min = 15, max = 25): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
