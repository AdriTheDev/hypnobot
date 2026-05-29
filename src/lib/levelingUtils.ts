export function xpForLevel(level: number): number {
	return 5 * level * level + 50 * level + 100;
}

export function totalXPForLevel(level: number): number {
	let total = 0;
	for (let i = 0; i < level; i++) total += xpForLevel(i);
	return total;
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
