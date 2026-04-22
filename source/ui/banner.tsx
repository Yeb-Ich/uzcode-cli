import React from 'react';
import {Box, Text} from 'ink';

type Props = {
	model: string;
	version: string;
};

const LOGO = [
    "@@@@@@@@@@@@@@@@@@@@$$$&$#$&XX@@@@@@@@@@@@@@@@@@@@@",
    "@@@@@@@@@@@@@@@X$*+*x**++*#+=+#*+*xx&X@@@@@@@@@@@@@",
    "@@@@@@@@@@@$#*&+x&xx$-====+&&+.+&x++x**$$X@@@@@@@@@",
    "@@@@@@@&x+x#&x*=**x+x.+=+$x*x$$-.x&xxx=+=+=xXX@@@@@",
    "@@@@@*=*$&##*=.-=.=-=-=--++-*$XX=.+XX*=-=+.+=x@X@@@",
    "@@@*.x$$$$#x=-  =  ......=.-x&&XX= *X@$---*#=+X&$X@",
    "@@*=xxx$+#&$=-.-==------  -.+x&&&&- xX$x=.##*x$*=&@",
    "@@*=x+ #..##*#$=-=-+=+x*--$#$*$&$##.-&$#x#$-=+x=-$@",
    "@@x=+=-. .*-x#  - +.=**$*#x- x+-*xx  #x--=#.-=--*@@",
    "@@$.$#..+-+  *.  -.---*=.+.  -=++*x  #+*.+.*.-+-+@@",
    "@@# +#x= ...-##+  ....+  =+--   -+*  *$--=-&x-  -@@",
    "@@$           -**-   -*=...-==-###x  *&$.. .    +@@",
    "@@$                          .=====. ==.        *@@",
    "@@&                                            +X@@",
    "@@@$*=-.                                    .+$&X@@",
    "@@@&&&&&&&$#x**+==-..                    -*$$$$&X@@",
    "@@@&&&&&&&&&&&&&&&&&&&&&&$##*++======*#$&&&&&&XX@@@",
    "@@@&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&X&X@@@",
];

export default function Banner({model, version}: Props) {
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
						<Text color="gray">
							{' '}Local | {model} (/model to change)
						</Text>
						<Text>{' '}</Text>
						<Text color="gray">{' '}~</Text>
					</Box>
				</Box>
			</Box>
		</Box>
	);
}
