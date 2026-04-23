const DEFAULT_LM_STUDIO_BASE_URL = 'http://192.168.0.240:1234/v1';

function trimTrailingSlash(url: string): string {
	return url.replace(/\/+$/, '');
}

export function getLmStudioBaseUrl(): string {
	const raw =
		process.env['UZCODE_LM_STUDIO_BASE_URL'] ?? DEFAULT_LM_STUDIO_BASE_URL;
	return trimTrailingSlash(raw);
}

export function getLmStudioModelsUrl(): string {
	return `${getLmStudioBaseUrl()}/models`;
}
