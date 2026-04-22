import React from 'react';
import {Box, Text} from 'ink';
import Spinner from 'ink-spinner';

type Props = {
	active: boolean;
};

export default function SpinnerRow({active}: Props) {
	if (!active) {
		return null;
	}

	return (
		<Box marginBottom={1}>
			<Text color="yellow">
				<Spinner type="dots" /> 🤔 Думаю...
			</Text>
		</Box>
	);
}
