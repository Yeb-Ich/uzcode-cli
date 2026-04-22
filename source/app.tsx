import fs from 'node:fs/promises';
import path from 'node:path';
import {promisify} from 'node:util';
import {exec as execCallback} from 'node:child_process';
import React, {useCallback, useMemo, useRef, useState} from 'react';
import OpenAI from 'openai';
import {Box, Text} from 'ink';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';

const exec = promisify(execCallback);

type AppProps = {
	initialPrompt?: string;
	model?: string;
};

type Role = 'user' | 'assistant' | 'tool' | 'system';

type LogItem = {
	id: number;
	title: string;
	content: string;
	type: 'reasoning' | 'assistant' | 'tool' | 'error' | 'system';
};

type PendingApproval = {
	title: string;
	details: string;
	resolve: (approved: boolean) => void;
};

type ToolContext = {
	requestApproval: (title: string, details: string) => Promise<boolean>;
	appendLog: (item: Omit<LogItem, 'id'>) => void;
};

type ToolHandlers = {
	list_files: (arguments_: {directory: string}, context: ToolContext) => Promise<string>;
	read_file: (arguments_: {path: string}, context: ToolContext) => Promise<string>;
	write_file: (arguments_: {path: string; content: string}, context: ToolContext) => Promise<string>;
	execute_command: (arguments_: {command: string}, context: ToolContext) => Promise<string>;
};

const TOOL_DEFINITIONS = [
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
			description: 'Write content to file. Requires explicit user confirmation in CLI.',
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
			description: 'Execute shell command and return stdout/stderr. Requires explicit user confirmation in CLI.',
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

const SYSTEM_PROMPT = [
	'You are a coding agent running inside a CLI app.',
	'You can inspect files, read files, write files and execute shell commands through tools.',
	'Use tools when needed, and produce concise final answers.',
	'When editing files, prefer minimal diffs and do not delete unrelated content.',
].join(' ');

const MAX_FILE_TREE_DEPTH = 6;

const colorByType: Record<LogItem['type'], string> = {
	reasoning: 'gray',
	assistant: 'cyan',
	tool: 'yellow',
	error: 'red',
	system: 'green',
};

async function buildDirectoryTree(directory: string, depth = 0): Promise<string[]> {
	if (depth > MAX_FILE_TREE_DEPTH) {
		return ['...'];
	}

	let entries = await fs.readdir(directory, {withFileTypes: true});
	entries = entries.filter(entry => !['.git', 'node_modules', 'dist'].includes(entry.name));
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

function parseToolArguments(rawArguments: string | undefined): Record<string, unknown> {
	if (!rawArguments?.trim()) {
		return {};
	}

	try {
		return JSON.parse(rawArguments) as Record<string, unknown>;
	} catch {
		return {};
	}
}

function safeContent(value: unknown): string {
	if (typeof value === 'string') {
		return value;
	}

	if (Array.isArray(value)) {
		return value
			.map(part => {
				if (typeof part === 'string') {
					return part;
				}

				if (part && typeof part === 'object' && 'text' in part) {
					return String((part as {text?: unknown}).text ?? '');
				}

				return '';
			})
			.join('')
			.trim();
	}

	return '';
}

function getReasoningContent(message: unknown): string {
	if (!message || typeof message !== 'object') {
		return '';
	}

	const typedMessage = message as {
		reasoning_content?: unknown;
		reasoning?: unknown;
	};

	if (typeof typedMessage.reasoning_content === 'string') {
		return typedMessage.reasoning_content;
	}

	if (typeof typedMessage.reasoning === 'string') {
		return typedMessage.reasoning;
	}

	return '';
}

const toolHandlers: ToolHandlers = {
	async list_files(arguments_, context) {
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
	},

	async read_file(arguments_, context) {
		if (typeof arguments_.path !== 'string' || arguments_.path.trim().length === 0) {
			throw new Error('read_file requires a non-empty "path".');
		}

		const absolutePath = path.resolve(process.cwd(), arguments_.path);
		const content = await fs.readFile(absolutePath, 'utf8');
		const result = `Path: ${absolutePath}\n\n${content}`;
		context.appendLog({
			title: `Tool read_file(${arguments_.path})`,
			content: content,
			type: 'tool',
		});
		return result;
	},

	async write_file(arguments_, context) {
		if (typeof arguments_.path !== 'string' || arguments_.path.trim().length === 0) {
			throw new Error('write_file requires a non-empty "path".');
		}

		if (typeof arguments_.content !== 'string') {
			throw new Error('write_file requires "content" string.');
		}

		const approved = await context.requestApproval(
			'Confirm write_file (y/n)',
			`Path: ${arguments_.path}`,
		);

		if (!approved) {
			const denied = 'User denied write_file.';
			context.appendLog({
				title: `Tool write_file(${arguments_.path})`,
				content: denied,
				type: 'tool',
			});
			return denied;
		}

		const absolutePath = path.resolve(process.cwd(), arguments_.path);
		await fs.mkdir(path.dirname(absolutePath), {recursive: true});
		await fs.writeFile(absolutePath, arguments_.content, 'utf8');
		const result = `Written ${arguments_.content.length} chars to ${absolutePath}`;
		context.appendLog({
			title: `Tool write_file(${arguments_.path})`,
			content: result,
			type: 'tool',
		});
		return result;
	},

	async execute_command(arguments_, context) {
		if (typeof arguments_.command !== 'string' || arguments_.command.trim().length === 0) {
			throw new Error('execute_command requires a non-empty "command".');
		}

		const approved = await context.requestApproval(
			'Confirm execute_command (y/n)',
			`Command: ${arguments_.command}`,
		);

		if (!approved) {
			const denied = 'User denied execute_command.';
			context.appendLog({
				title: `Tool execute_command(${arguments_.command})`,
				content: denied,
				type: 'tool',
			});
			return denied;
		}

		try {
			const {stdout, stderr} = await exec(arguments_.command, {
				cwd: process.cwd(),
				timeout: 120_000,
				maxBuffer: 1024 * 1024,
				env: process.env,
				shell: '/bin/bash',
			});

			const result = [
				`Command: ${arguments_.command}`,
				'Exit code: 0',
				`stdout:\n${stdout || '(empty)'}`,
				`stderr:\n${stderr || '(empty)'}`,
			].join('\n\n');

			context.appendLog({
				title: `Tool execute_command(${arguments_.command})`,
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
				`Command: ${arguments_.command}`,
				`Exit code: ${String(error.code ?? 'unknown')}`,
				`stdout:\n${error.stdout || '(empty)'}`,
				`stderr:\n${error.stderr || '(empty)'}`,
				`message:\n${error.message || '(none)'}`,
			].join('\n\n');

			context.appendLog({
				title: `Tool execute_command(${arguments_.command})`,
				content: result,
				type: 'tool',
			});

			return result;
		}
	},
};

export default function App({
	initialPrompt = '',
	model = 'qwen/qwen3-14b',
}: AppProps) {
	const [input, setInput] = useState(initialPrompt);
	const [isRunning, setIsRunning] = useState(false);
	const [isWaitingModel, setIsWaitingModel] = useState(false);
	const [pendingApproval, setPendingApproval] = useState<PendingApproval | undefined>();
	const [logs, setLogs] = useState<LogItem[]>([]);
	const logIdRef = useRef(1);

	const client = useMemo(
		() =>
			new OpenAI({
				baseURL: 'http://127.0.0.1:1234/v1',
				apiKey: 'lms',
			}),
		[],
	);

	const appendLog = useCallback((item: Omit<LogItem, 'id'>) => {
		setLogs(previous => [
			...previous,
			{
				...item,
				id: logIdRef.current++,
			},
		]);
	}, []);

	const requestApproval = useCallback((title: string, details: string) => {
		return new Promise<boolean>(resolve => {
			setPendingApproval({title, details, resolve});
		});
	}, []);

	const runAgentStep = useCallback(
		async (
			messages: Array<Record<string, unknown>>,
			context: ToolContext,
		): Promise<string> => {
			setIsWaitingModel(true);

			const completion = await client.chat.completions.create({
				model,
				messages: messages as never,
				tools: TOOL_DEFINITIONS,
				tool_choice: 'auto',
			});

			setIsWaitingModel(false);

			const choice = completion.choices[0];
			const message = choice?.message;

			if (!message) {
				return 'No response from model.';
			}

			const reasoning = getReasoningContent(message);
			if (reasoning) {
				context.appendLog({
					title: 'Reasoning',
					content: reasoning,
					type: 'reasoning',
				});
			}

			const toolCalls = message.tool_calls ?? [];
			if (toolCalls.length === 0) {
				const finalAnswer = safeContent(message.content) || 'Done.';
				context.appendLog({
					title: 'Assistant',
					content: finalAnswer,
					type: 'assistant',
				});
				return finalAnswer;
			}

			const nextMessages = [
				...messages,
				{
					role: 'assistant' as Role,
					content: safeContent(message.content),
					tool_calls: toolCalls,
				},
			];

			for (const toolCall of toolCalls) {
				if (toolCall.type !== 'function') {
					continue;
				}

				const handler = toolHandlers[toolCall.function.name as keyof ToolHandlers];
				if (!handler) {
					nextMessages.push({
						role: 'tool' as Role,
						tool_call_id: toolCall.id,
						content: `Unknown tool: ${toolCall.function.name}`,
					});
					continue;
				}

				const parsedArguments = parseToolArguments(toolCall.function.arguments);

				try {
					const result = await handler(parsedArguments as never, context);
					nextMessages.push({
						role: 'tool' as Role,
						tool_call_id: toolCall.id,
						content: result,
					});
				} catch (error_) {
					const error = error_ as Error;
					const message_ = `Tool ${toolCall.function.name} failed: ${error.message}`;
					context.appendLog({
						title: 'Tool Error',
						content: message_,
						type: 'error',
					});
					nextMessages.push({
						role: 'tool' as Role,
						tool_call_id: toolCall.id,
						content: message_,
					});
				}
			}

			return runAgentStep(nextMessages, context);
		},
		[client, model],
	);

	const startRun = useCallback(
		async (prompt: string) => {
			if (prompt.trim().length === 0) {
				appendLog({
					title: 'System',
					content: 'Enter a task and press Enter.',
					type: 'system',
				});
				return;
			}

			setIsRunning(true);
			appendLog({
				title: 'User',
				content: prompt,
				type: 'system',
			});

			const messages: Array<Record<string, unknown>> = [
				{role: 'system' as Role, content: SYSTEM_PROMPT},
				{role: 'user' as Role, content: prompt},
			];

			const context: ToolContext = {
				appendLog,
				requestApproval,
			};

			try {
				await runAgentStep(messages, context);
			} catch (error_) {
				const error = error_ as Error;
				appendLog({
					title: 'Error',
					content: error.message,
					type: 'error',
				});
			} finally {
				setIsWaitingModel(false);
				setIsRunning(false);
			}
		},
		[appendLog, requestApproval, runAgentStep],
	);

	const onSubmit = useCallback(
		(value: string) => {
			if (pendingApproval) {
				const normalized = value.trim().toLowerCase();
				if (!['y', 'yes', 'n', 'no'].includes(normalized)) {
					appendLog({
						title: 'System',
						content: 'Type y/yes or n/no.',
						type: 'system',
					});
					setInput('');
					return;
				}

				const approved = normalized === 'y' || normalized === 'yes';
				const resolver = pendingApproval.resolve;
				setPendingApproval(undefined);
				setInput('');
				resolver(approved);
				return;
			}

			if (isRunning) {
				appendLog({
					title: 'System',
					content: 'Agent is already running. Wait for completion.',
					type: 'system',
				});
				setInput('');
				return;
			}

			const prompt = value.trim();
			setInput('');
			void startRun(prompt);
		},
		[appendLog, isRunning, pendingApproval, startRun],
	);

	return (
		<Box flexDirection="column" padding={1}>
			<Box borderStyle="round" borderColor="blue" paddingX={1} marginBottom={1}>
				<Text color="blue">Local LLM Agent • model: {model}</Text>
			</Box>

			{logs.map(item => (
				<Box
					key={item.id}
					flexDirection="column"
					borderStyle="round"
					borderColor={colorByType[item.type]}
					paddingX={1}
					marginBottom={1}
				>
					<Text color={colorByType[item.type]}>{item.title}</Text>
					<Text>{item.content}</Text>
				</Box>
			))}

			{pendingApproval && (
				<Box borderStyle="round" borderColor="magenta" paddingX={1} marginBottom={1}>
					<Box flexDirection="column">
						<Text color="magenta">{pendingApproval.title}</Text>
						<Text>{pendingApproval.details}</Text>
						<Text>Type y/n and press Enter.</Text>
					</Box>
				</Box>
			)}

			{isWaitingModel && (
				<Box marginBottom={1}>
					<Text color="yellow">
						<Spinner type="dots" /> Waiting for model response...
					</Text>
				</Box>
			)}

			<Box borderStyle="round" borderColor="gray" paddingX={1}>
				<Box flexDirection="column" width="100%">
					<Text color="green">Prompt / Confirmation input:</Text>
					<TextInput
						value={input}
						onChange={setInput}
						onSubmit={onSubmit}
						placeholder={
							pendingApproval
								? 'Type y or n...'
								: 'Describe the task for the agent and press Enter...'
						}
					/>
				</Box>
			</Box>
		</Box>
	);
}
