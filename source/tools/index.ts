import type {ToolHandlers} from '../types/index.js';
import {listFiles} from './list-files.js';
import {readFile} from './read-file.js';
import {writeFile} from './write-file.js';
import {executeCommand} from './execute-command.js';

export const toolHandlers: ToolHandlers = {
	list_files: listFiles,
	read_file: readFile,
	write_file: writeFile,
	execute_command: executeCommand,
};

export const TOOL_DEFINITIONS = [
	{
		type: 'function' as const,
		function: {
			name: 'list_files',
			description: 'Return a readable file tree for the provided directory.',
			parameters: {
				type: 'object',
				properties: {
					directory: {
						type: 'string',
						description: 'Directory path to inspect.',
					},
				},
				required: ['directory'],
				additionalProperties: false,
			},
		},
	},
	{
		type: 'function' as const,
		function: {
			name: 'read_file',
			description: 'Read file content from disk.',
			parameters: {
				type: 'object',
				properties: {
					path: {
						type: 'string',
						description: 'Path to file.',
					},
				},
				required: ['path'],
				additionalProperties: false,
			},
		},
	},
	{
		type: 'function' as const,
		function: {
			name: 'write_file',
			description:
				'Write content to file. Requires explicit user confirmation in CLI.',
			parameters: {
				type: 'object',
				properties: {
					path: {
						type: 'string',
						description: 'Path to file.',
					},
					content: {
						type: 'string',
						description: 'Full file content to write.',
					},
				},
				required: ['path', 'content'],
				additionalProperties: false,
			},
		},
	},
	{
		type: 'function' as const,
		function: {
			name: 'execute_command',
			description:
				'Execute shell command and return stdout/stderr. Requires explicit user confirmation in CLI.',
			parameters: {
				type: 'object',
				properties: {
					command: {
						type: 'string',
						description: 'Shell command to execute.',
					},
				},
				required: ['command'],
				additionalProperties: false,
			},
		},
	},
];
