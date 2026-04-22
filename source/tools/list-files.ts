import path from 'node:path';
import type {ToolHandler, ToolContext} from '../types/index.js';
import {buildDirectoryTree} from './file-tree.js';

export const listFiles: ToolHandler = async (arguments_, context: ToolContext) => {
	const targetPath =
		typeof arguments_['path'] === 'string'
			? arguments_['path']
			: (typeof arguments_['directory'] === 'string' ? arguments_['directory'] : '.');
	const absolutePath = path.resolve(process.cwd(), targetPath);
	const tree = await buildDirectoryTree(absolutePath);
	const result = `Directory: ${absolutePath}\n${tree.join('\n')}`;
	context.appendLog({
		title: `🔍 Сканирую проект: ${targetPath}`,
		content: result,
		type: 'tool',
	});
	return result;
};
