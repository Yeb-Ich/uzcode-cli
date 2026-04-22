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
		<Box borderStyle="round" borderColor="gray" paddingX={1}>
			<Box flexDirection="column" width="100%">
				<Text color="green">Prompt / Confirmation input:</Text>
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
	);
}
