import {promisify} from 'node:util';
import {exec as execCallback} from 'node:child_process';
import type {ToolHandler, ToolContext} from '../types/index.js';

const exec = promisify(execCallback);

export const executeCommand: ToolHandler = async (
	arguments_,
	context: ToolContext,
) => {
	if (typeof arguments_['command'] !== 'string' || arguments_['command'].trim().length === 0) {
		throw new Error('execute_command requires a non-empty "command".');
	}

	const approved = await context.requestApproval(
		'Confirm execute_command (y/n)',
		`Command: ${arguments_['command']}`,
	);

	if (!approved) {
		const denied = 'User denied execute_command.';
		context.appendLog({
			title: `🛠 Выполняю команду: ${arguments_['command']}`,
			content: denied,
			type: 'tool',
		});
		return denied;
	}

	try {
		const {stdout, stderr} = await exec(arguments_['command'], {
			cwd: process.cwd(),
			timeout: 120_000,
			maxBuffer: 1024 * 1024,
			env: process.env,
			shell: '/bin/bash',
		});

		const result = [
			`Command: ${arguments_['command']}`,
			'Exit code: 0',
			`stdout:\n${stdout || '(empty)'}`,
			`stderr:\n${stderr || '(empty)'}`,
		].join('\n\n');

		context.appendLog({
			title: `🛠 Выполняю команду: ${arguments_['command']}`,
			content: result,
			type: 'tool',
		});

		return result;
	} catch (error_) {
		const error = error_ as {
			code?: number;
			stdout?: string;
			stderr?: string;
			message?: string;
		};

		const result = [
			`Command: ${arguments_['command']}`,
			`Exit code: ${String(error.code ?? 'unknown')}`,
			`stdout:\n${error.stdout || '(empty)'}`,
			`stderr:\n${error.stderr || '(empty)'}`,
			`message:\n${error.message || '(none)'}`,
		].join('\n\n');

		context.appendLog({
			title: `🛠 Выполняю команду: ${arguments_['command']}`,
			content: result,
			type: 'tool',
		});

		return result;
	}
};
