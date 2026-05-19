const STORAGE_KEY_PREFIX = 'bom-compare-';

export function saveToStorage(key: string, value: unknown): void {
	try {
		localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
	} catch {}
}

export function loadFromStorage<T>(key: string, defaultValue: T): T {
	try {
		const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
		if (raw) return JSON.parse(raw) as T;
	} catch {}
	return defaultValue;
}

export function addRecentFile(filePath: string): void {
	const recent = loadFromStorage<string[]>('recent-files', []);
	const filtered = recent.filter(f => f !== filePath);
	filtered.unshift(filePath);
	saveToStorage('recent-files', filtered.slice(0, 10));
}

export function getRecentFiles(): string[] {
	return loadFromStorage<string[]>('recent-files', []);
}
