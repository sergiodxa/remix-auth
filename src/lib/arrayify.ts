export function arrayify<T>(item: T | T[]): T[] {
	return Array.isArray(item) ? item : [item];
}
