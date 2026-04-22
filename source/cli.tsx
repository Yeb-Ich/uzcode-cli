import React from 'react';
import {render} from 'ink';
import meow from 'meow';
import App from './app.js';

const cli = meow(
	`
	Usage
	  $ uzcode-cli "fix build errors"

	Options
		--model  Model name for LM Studio

	Examples
	  $ uzcode-cli "Добавь тесты для parser"
	  $ uzcode-cli --model=qwen/qwen3-14b "Почини lint"
`,
	{
		importMeta: import.meta,
		flags: {
			model: {
				type: 'string',
				default: 'qwen/qwen3-14b',
			},
		},
	},
);

render(<App initialPrompt={cli.input.join(' ')} model={cli.flags.model} />);
