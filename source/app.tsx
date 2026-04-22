import React, {useCallback, useMemo, useRef, useState} from 'react';
import {Box} from 'ink';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import type {LogItem, PendingApproval, Role, AppProps} from './types/index.js';
import {createClient} from './agent/client.js';
import {SYSTEM_PROMPT} from './agent/prompt.js';
import {runAgentLoop} from './agent/loop.js';
import LogPanel from './ui/log-panel.js';
import ApprovalPanel from './ui/approval-panel.js';
import SpinnerRow from './ui/spinner-row.js';
import PromptInput from './ui/prompt-input.js';
import Banner from './ui/banner.js';

function getVersion(): string {
	const candidates = [
		path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json'),
		path.join(process.cwd(), 'package.json'),
	];

	for (const pkgPath of candidates) {
		try {
			const raw = fs.readFileSync(pkgPath, 'utf8');
			const pkg = JSON.parse(raw) as {version: string};
			if (pkg.version) {
				return pkg.version;
			}
		} catch {
			continue;
		}
	}

	return '0.0.0';
}

const VERSION = getVersion();

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

	const client = useMemo(() => createClient(), []);

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

			const context = {
				appendLog,
				requestApproval,
			};

			try {
				await runAgentLoop(client, model, messages, context, setIsWaitingModel);
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
		[appendLog, client, model, requestApproval],
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
			<Banner model={model} currentVersion={VERSION} />

			<LogPanel items={logs} />
			<ApprovalPanel pending={pendingApproval} />
			<SpinnerRow active={isWaitingModel} />
			<PromptInput
				value={input}
				onChange={setInput}
				onSubmit={onSubmit}
				pendingApproval={pendingApproval}
			/>
		</Box>
	);
}
