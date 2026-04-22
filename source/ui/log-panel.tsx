import React from 'react';
import {Box, Static, Text} from 'ink';
import type {LogItem} from '../types/index.js';

const colorByType: Record<LogItem['type'], string> = {
	reasoning: 'gray',
	assistant: 'cyan',
	tool: 'yellow',
	error: 'red',
	system: 'green',
};

type Props = {
	items: LogItem[];
};

export default function LogPanel({items}: Props) {
	return (
		<Static items={items}>
			{item => (
				<Box
					key={item.id}
					flexDirection="column"
					borderStyle="round"
					borderColor={colorByType[item.type]}
					paddingX={1}
					marginBottom={1}
					minHeight={item.type === 'reasoning' ? 4 : undefined}
				>
					<Text color={colorByType[item.type]} dimColor={item.type === 'reasoning'}>
						{item.title}
					</Text>
					<Text dimColor={item.type === 'reasoning'}>{item.content}</Text>
				</Box>
			)}
		</Static>
	);
}
