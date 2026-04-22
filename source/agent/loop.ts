import type OpenAI from 'openai';
import type {Role, ToolContext} from '../types/index.js';
import {TOOL_DEFINITIONS, toolHandlers} from '../tools/index.js';

type ProcessChatResult = {
	finalAnswer: string;
	messages: Array<Record<string, unknown>>;
};

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

function shouldForceToolFallback(text: string): boolean {
	const normalized = text.toLowerCase();
	const patterns = [
		'write_file',
		'execute_command',
		'read_file',
		'list_files',
		'запиш',
		'сохрани',
		'создай файл',
		'write it to file',
		'save it to file',
		'run command',
		'выполни команд',
		'read file',
		'прочитай файл',
	];

	return patterns.some(pattern => normalized.includes(pattern));
}

export async function processChat(
	client: OpenAI,
	model: string,
	messages: Array<Record<string, unknown>>,
	context: ToolContext,
	onWaitingChange: (waiting: boolean) => void,
): Promise<ProcessChatResult> {
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
		return {
			finalAnswer: 'No response from model.',
			messages,
		};
	}

	const reasoning = getReasoningContent(message);
	if (reasoning) {
		context.appendLog({
			title: '🤔 Думаю...',
			content: reasoning,
			type: 'reasoning',
		});
	}

	const toolCalls = message.tool_calls ?? [];
	if (toolCalls.length === 0) {
		const finalAnswer = safeContent(message.content) || 'Done.';
		const assistantMessage = {
			role: 'assistant' as Role,
			content: finalAnswer,
		};

		if (shouldForceToolFallback(finalAnswer)) {
			onWaitingChange(true);
			const fallbackCompletion = await client.chat.completions.create({
				model,
				messages: [
					...messages,
					assistantMessage,
					{
						role: 'system' as Role,
						content:
							'You described an action. Call the appropriate tool now using tool_calls only.',
					},
				] as never,
				tools: TOOL_DEFINITIONS,
				tool_choice: 'auto',
			});
			onWaitingChange(false);

			const fallbackMessage = fallbackCompletion.choices[0]?.message;
			const fallbackToolCalls = fallbackMessage?.tool_calls ?? [];
			if (fallbackToolCalls.length > 0) {
				return processChat(
					client,
					model,
					[
						...messages,
						assistantMessage,
						{
							role: 'assistant' as Role,
							content: safeContent(fallbackMessage?.content),
							tool_calls: fallbackToolCalls,
						},
					],
					context,
					onWaitingChange,
				);
			}
		}

		context.appendLog({
			title: 'Assistant',
			content: finalAnswer,
			type: 'assistant',
		});
		return {
			finalAnswer,
			messages: [...messages, assistantMessage],
		};
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

	return processChat(client, model, nextMessages, context, onWaitingChange);
}
