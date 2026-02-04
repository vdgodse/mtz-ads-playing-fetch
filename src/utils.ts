export function randomFrom<T>(items: readonly T[]): T {
	if (items.length === 0) {
		throw new Error("randomFrom: cannot pick from empty array");
	}
	const idx = Math.floor(Math.random() * items.length);
	return items[idx] as T;
}
