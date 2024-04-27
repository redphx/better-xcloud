#!/usr/bin/env bun
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { sys } from "typescript";
import txtScriptHeader from "./src/header_script.txt" with { type: "text" };
import txtMetaHeader from "./src/header_meta.txt" with { type: "text" };

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

const build = async (target: BuildTarget, version: string, config: any={}) => {
	console.log('-- Target:', target);
	const startTime = performance.now();

	let outputScriptName = 'better-xcloud';
	if (target !== BuildTarget.ALL) {
		outputScriptName += `.${target}`;
	}
	let outputMetaName = outputScriptName;
	outputScriptName += '.user.js';
	outputMetaName += '.meta.js';

	const outDir = './dist';

	let output = await Bun.build({
		entrypoints: ['src/index.ts'],
		outdir: outDir,
		naming: outputScriptName,
		define: {
			'Bun.env.BUILD_TARGET': JSON.stringify(target),
			'Bun.env.SCRIPT_VERSION': JSON.stringify(version),
		},
	});

	if (!output.success) {
		console.log(output);
		process.exit(1);
	}

	const {path} = output.outputs[0];
	// Get generated file
	let result = postProcess(await readFile(path, 'utf-8'));

	// Replace [[VERSION]] with real value
	const scriptHeader = txtScriptHeader.replace('[[VERSION]]', version);

	// Save to script
	await Bun.write(path, scriptHeader + result);
	console.log(`---- [${target}] done in ${performance.now() - startTime} ms`);

	// Create meta file
	await Bun.write(outDir + '/' + outputMetaName, txtMetaHeader.replace('[[VERSION]]', version));
}

const buildTargets = [
	BuildTarget.ALL,
	// BuildTarget.ANDROID_APP,
	// BuildTarget.MOBILE,
	// BuildTarget.WEBOS,
];

const { values, positionals } = parseArgs({
	args: Bun.argv,
	options: {
	  version: {
		type: 'string',

	  },
	},
	strict: true,
	allowPositionals: true,
  });

if (!values['version']) {
	console.log('Missing --version param');
	sys.exit(-1);
}

console.log('Building: ', values['version']);

const config = {};
for (const target of buildTargets) {
	await build(target, values['version'], config);
}
