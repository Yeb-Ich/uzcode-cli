import OpenAI from 'openai';
import {getLmStudioBaseUrl} from '../config/network.js';

export function createClient(): OpenAI {
	return new OpenAI({
		baseURL: getLmStudioBaseUrl(),
		apiKey: 'lms',
	});
}
