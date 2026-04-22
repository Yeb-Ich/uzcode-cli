import type OpenAI from 'openai';
import type {Role, ToolContext} from '../types/index.js';
import {TOOL_DEFINITIONS, toolHandlers} from '../tools/index.js';

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

export async function runAgentLoop(
	client: OpenAI,
	model: string,
	messages: Array<Record<string, unknown>>,
	context: ToolContext,
	onWaitingChange: (waiting: boolean) => void,
): Promise<string> {
	onWaitingChange(true);

	const completion = await client.chat.completions.create({
		model,
		messages: messages as never,
		tools: TOOL_DEFINITIONS,
		tool_choice: 'auto',
	});

	onWaitingChange(false);

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

		const handler = toolHandlers[toolCall.function.name];
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
			const result = await handler(parsedArguments, context);
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

	return runAgentLoop(client, model, nextMessages, context, onWaitingChange);
}
