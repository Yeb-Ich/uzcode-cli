import React from 'react';
import {Box, Text} from 'ink';
import type {PendingApproval} from '../types/index.js';

type Props = {
	pending: PendingApproval | undefined;
};

export default function ApprovalPanel({pending}: Props) {
	if (!pending) {
		return null;
	}

	return (
		<Box borderStyle="round" borderColor="magenta" paddingX={1} marginBottom={1}>
			<Box flexDirection="column">
				<Text color="magenta">{pending.title}</Text>
				<Text>{pending.details}</Text>
				<Text>Type y/n and press Enter.</Text>
			</Box>
		</Box>
	);
}
