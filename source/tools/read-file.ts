import fs from 'node:fs/promises';
import path from 'node:path';
import type {ToolHandler, ToolContext} from '../types/index.js';

export const readFile: ToolHandler = async (arguments_, context: ToolContext) => {
	if (typeof arguments_['path'] !== 'string' || arguments_['path'].trim().length === 0) {
		throw new Error('read_file requires a non-empty "path".');
	}

	const absolutePath = path.resolve(process.cwd(), arguments_['path']);
	const content = await fs.readFile(absolutePath, 'utf8');
	const result = `Path: ${absolutePath}\n\n${content}`;
	context.appendLog({
		title: `Tool read_file(${arguments_['path']})`,
		content,
		type: 'tool',
	});
	return result;
};
