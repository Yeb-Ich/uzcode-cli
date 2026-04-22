import React from 'react';
import {Box, Text} from 'ink';
import TextInput from 'ink-text-input';
import type {PendingApproval} from '../types/index.js';

type Props = {
	value: string;
	onChange: (value: string) => void;
	onSubmit: (value: string) => void;
	pendingApproval: PendingApproval | undefined;
};

export default function PromptInput({
	value,
	onChange,
	onSubmit,
	pendingApproval,
}: Props) {
	return (
		<Box
			borderStyle="bold"
			borderColor="magenta"
			paddingX={1}
			marginTop={1}
		>
			<Box flexDirection="row" width="100%">
				<Text color="magenta" bold>{' >_ '}</Text>
				<Box flexDirection="column" flexGrow={1}>
					{pendingApproval && (
						<Text color="magenta" dimColor>
							{pendingApproval.title}: {pendingApproval.details}
						</Text>
					)}
					<TextInput
						value={value}
						onChange={onChange}
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
