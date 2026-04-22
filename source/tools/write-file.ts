import fs from 'node:fs/promises';
import path from 'node:path';
import type {ToolHandler, ToolContext} from '../types/index.js';

export const writeFile: ToolHandler = async (arguments_, context: ToolContext) => {
	if (typeof arguments_['path'] !== 'string' || arguments_['path'].trim().length === 0) {
		throw new Error('write_file requires a non-empty "path".');
	}

	if (typeof arguments_['content'] !== 'string') {
		throw new Error('write_file requires "content" string.');
	}

	const normalizedPath = path.normalize(arguments_['path']);
	const absolutePath = path.resolve(process.cwd(), normalizedPath);

	const approved = await context.requestApproval(
		'Confirm write_file (y/n)',
		`Path: ${normalizedPath}`,
	);

	if (!approved) {
		const denied = 'User denied write_file.';
		context.appendLog({
			title: `Tool write_file(${normalizedPath})`,
			content: denied,
			type: 'tool',
		});
		return denied;
	}

	await fs.mkdir(path.dirname(absolutePath), {recursive: true});
	await fs.writeFile(absolutePath, arguments_['content'], 'utf8');
	const result = `Written ${arguments_['content'].length} chars to ${absolutePath}`;
	context.appendLog({
		title: `Tool write_file(${normalizedPath})`,
		content: result,
		type: 'tool',
	});
	return result;
};
