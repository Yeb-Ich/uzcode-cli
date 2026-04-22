import path from 'node:path';
import type {ToolHandler, ToolContext} from '../types/index.js';
import {buildDirectoryTree} from './file-tree.js';

export const listFiles: ToolHandler = async (arguments_, context: ToolContext) => {
	const directory = typeof arguments_.directory === 'string' ? arguments_.directory : '.';
	const absolutePath = path.resolve(process.cwd(), directory);
	const tree = await buildDirectoryTree(absolutePath);
	const result = `Directory: ${absolutePath}\n${tree.join('\n')}`;
	context.appendLog({
		title: `Tool list_files(${directory})`,
		content: result,
		type: 'tool',
	});
	return result;
};
