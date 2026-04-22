import React, {useEffect, useState} from 'react';
import {Box, Text} from 'ink';
import axios from 'axios';

type Props = {
	model: string;
	version: string;
};

const LOGO = [
	'@@@@@@@@@@@@@@@@@@@@$$$&$#$&XX@@@@@@@@@@@@@@@@@@@@@',
	'@@@@@@@@@@@@@@@X$*+*x**++*#+=+#*+*xx&X@@@@@@@@@@@@@',
	'@@@@@@@@@@@$#*&+x&xx$-====+&&+.+&x++x**$$X@@@@@@@@@',
	'@@@@@@@&x+x#&x*=**x+x.+=+$x*x$$-.x&xxx=+=+=xXX@@@@@',
	'@@@@@*=*$&##*=.-=.=-=-=--++-*$XX=.+XX*=-=+.+=x@X@@@',
	'@@@*.x$$$$#x=-  =  ......=.-x&&XX= *X@$---*#=+X&$X@',
	'@@*=xxx$+#&$=-.-==------  -.+x&&&&- xX$x=.##*x$*=&@',
	'@@*=x+ #..##*#$=-=-+=+x*--$#$*$&$##.-&$#x#$-=+x=-$@',
	'@@x=+=-. .*-x#  - +.=**$*#x- x+-*xx  #x--=#.-=--*@@',
	'@@$.$#..+-+  *.  -.---*=.+.  -=++*x  #+*.+.*.-+-+@@',
	'@@# +#x= ...-##+  ....+  =+--   -+*  *$--=-&x-  -@@',
	'@@$           -**-   -*=...-==-###x  *&$.. .    +@@',
	'@@$                          .=====. ==.        *@@',
	'@@&                                            +X@@',
	'@@@$*=-.                                    .+$&X@@',
	'@@@&&&&&&&$#x**+==-..                    -*$$$$&X@@',
	'@@@&&&&&&&&&&&&&&&&&&&&&&$##*++======*#$&&&&&&XX@@@',
	'@@@&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&X&X@@@',
];

const LM_STUDIO_URL = 'http://localhost:1234/v1/models';
const GITHUB_RELEASES_URL =
	'https://api.github.com/repos/Yeb-Ich/uzcode-cli/releases/latest';

function compareSemver(a: string, b: string): number {
	const parse = (v: string) =>
		v
			.replace(/^v/, '')
			.split('.')
			.map(Number);
	const aParts = parse(a);
	const bParts = parse(b);
	const aMajor = aParts[0] ?? 0;
	const aMinor = aParts[1] ?? 0;
	const aPatch = aParts[2] ?? 0;
	const bMajor = bParts[0] ?? 0;
	const bMinor = bParts[1] ?? 0;
	const bPatch = bParts[2] ?? 0;

	if (aMajor !== bMajor) {
		return aMajor - bMajor;
	}

	if (aMinor !== bMinor) {
		return aMinor - bMinor;
	}

	return aPatch - bPatch;
}

export default function Banner({model, version}: Props) {
	const [activeModel, setActiveModel] = useState<string | undefined>();
	const [serverOnline, setServerOnline] = useState(false);
	const [updateAvailable, setUpdateAvailable] = useState<string | undefined>();

	useEffect(() => {
		const fetchStatus = async () => {
			// Check LM Studio server
			try {
				const response = await axios.get(LM_STUDIO_URL, {timeout: 3000});
				const data = response.data as {data?: Array<{id: string}>};
				if (data.data && data.data.length > 0) {
					setActiveModel(data.data[0]!.id);
					setServerOnline(true);
				} else {
					setServerOnline(false);
				}
			} catch {
				setServerOnline(false);
			}

			// Check GitHub for newer release
			try {
				const response = await axios.get(GITHUB_RELEASES_URL, {timeout: 5000});
				const data = response.data as {tag_name?: string};
				if (data.tag_name && compareSemver(data.tag_name, version) > 0) {
					setUpdateAvailable(data.tag_name);
				}
			} catch {
				// Silently ignore — no internet or no releases yet
			}
		};

		void fetchStatus();
	}, [version]);

	const modelDisplay = serverOnline
		? (activeModel ?? model)
		: 'Server Offline';

	const serverColor = serverOnline ? 'green' : 'red';

	return (
		<Box flexDirection="column" marginBottom={1}>
			<Box
				borderStyle="bold"
				borderColor="magenta"
				paddingX={1}
				paddingY={0}
			>
				<Box flexDirection="row">
					<Box flexDirection="column" marginRight={1}>
						{LOGO.map((line, index) => (
							<Text key={index} color="magenta">
								{line}
							</Text>
						))}
					</Box>
					<Box flexDirection="column" justifyContent="center">
						<Text color="magenta" bold>
							{' '}_ UzCode (v{version})
						</Text>
						<Text>{' '}</Text>
						<Text color={serverColor}>
							{' '}{serverOnline ? 'Online' : 'Offline'} | {modelDisplay}
						</Text>
						<Text>{' '}</Text>
						{updateAvailable ? (
							<Text color="yellow">
								{' '}Update Available: {updateAvailable}
							</Text>
						) : (
							<Text color="gray">{' '}Up to date</Text>
						)}
						<Text>{' '}</Text>
						<Text color="gray">{' '}~</Text>
					</Box>
				</Box>
			</Box>
		</Box>
	);
}
