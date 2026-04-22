import fs from 'node:fs/promises';
import path from 'node:path';

const MAX_DEPTH = 6;

const IGNORED_NAMES = new Set(['.git', 'node_modules', 'dist']);

export async function buildDirectoryTree(
	directory: string,
	depth = 0,
): Promise<string[]> {
	if (depth > MAX_DEPTH) {
		return ['...'];
	}

	let entries = await fs.readdir(directory, {withFileTypes: true});
	entries = entries.filter(entry => !IGNORED_NAMES.has(entry.name));
	entries.sort((a, b) => {
		if (a.isDirectory() && !b.isDirectory()) {
			return -1;
		}

		if (!a.isDirectory() && b.isDirectory()) {
			return 1;
		}

		return a.name.localeCompare(b.name);
	});

	const lines: string[] = [];

	for (const entry of entries) {
		const prefix = '  '.repeat(depth);
		const marker = entry.isDirectory() ? '[D]' : '[F]';
		lines.push(`${prefix}${marker} ${entry.name}`);

		if (entry.isDirectory()) {
			const childPath = path.join(directory, entry.name);
			const childLines = await buildDirectoryTree(childPath, depth + 1);
			lines.push(...childLines);
		}
	}

	return lines;
}
