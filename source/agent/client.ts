import OpenAI from 'openai';

export function createClient(): OpenAI {
	return new OpenAI({
		baseURL: 'http://127.0.0.1:1234/v1',
		apiKey: 'lms',
	});
}
