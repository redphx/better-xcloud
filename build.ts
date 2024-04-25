#!/usr/bin/env bun
import { readFile } from "node:fs/promises";

enum BuildTarget {
	ALL = 'all',
	ANDROID_APP = 'android-app',
	MOBILE = 'mobile',
	WEBOS = 'webos',
}

const postProcess = (str: string): string => {
    // Unescape unicode charaters
    str = unescape((str.replace(/\\u/g, '%u')));
    // Replace \x00 to normal character
    str = str.replaceAll(/\\x[A-F0-9]{2}/g, (e) => String.fromCharCode(parseInt(e.substring(2), 16)));

    // Replace "globalThis." with "var";
    str = str.replaceAll('globalThis.', 'var ');

	// Add ADDITIONAL CODE block
	str = str.replace('var DEFAULT_FLAGS', '\n/* ADDITIONAL CODE */\n\nvar DEFAULT_FLAGS');

    return str;
}

const build = async (target: BuildTarget, config: any={}) => {
	console.log('--- Building:', target);
	const startTime = performance.now();

	let outputFileName = 'better-xcloud';
	if (target !== BuildTarget.ALL) {
		outputFileName += `.${target}`;
	}
	outputFileName += '.user.js';

	let output = await Bun.build({
		entrypoints: ['src/index.ts'],
		outdir: './dist',
		naming: outputFileName,
		define: {
			'Bun.env.BUILD_TARGET': JSON.stringify(target),
		},
	});

	if (!output.success) {
		console.log(output);
		process.exit(1);
	}

	const {path} = output.outputs[0];
	let result = postProcess(await readFile(path, 'utf-8'));
	const header = await readFile('src/header.txt', 'utf-8');
	await Bun.write(path, header + result);
	console.log(`[${target}] done in ${performance.now() - startTime} ms`);
}

const buildTargets = [
	BuildTarget.ALL,
	BuildTarget.ANDROID_APP,
	BuildTarget.MOBILE,
	// BuildTarget.WEBOS,
];

const config = {};
for (const target of buildTargets) {
	await build(target, config);
}
