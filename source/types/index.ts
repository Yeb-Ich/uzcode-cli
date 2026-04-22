export type Role = 'user' | 'assistant' | 'tool' | 'system';

export type LogItem = {
	id: number;
	title: string;
	content: string;
	type: 'reasoning' | 'assistant' | 'tool' | 'error' | 'system';
};

export type PendingApproval = {
	title: string;
	details: string;
	resolve: (approved: boolean) => void;
};

export type ToolContext = {
	requestApproval: (title: string, details: string) => Promise<boolean>;
	appendLog: (item: Omit<LogItem, 'id'>) => void;
};

export type ToolHandler = (
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	arguments_: Record<string, any>,
	context: ToolContext,
) => Promise<string>;

export type ToolHandlers = Record<string, ToolHandler>;

export type AppProps = {
	initialPrompt?: string;
	model?: string;
};
