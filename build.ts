#!/usr/bin/env bun
import { watch, readFile } from "node:fs/promises"

const postProcess = (str: string): string => {
    // Unescape unicode charaters
    str = unescape((str.replace(/\\u/g, '%u')));
    // Replace \x00 to normal character
    str = str.replaceAll(/\\x[A-F0-9]{2}/g, (e) => String.fromCharCode(parseInt(e.substring(2), 16)));

    // Replace "globalThis." with "var";
    str = str.replaceAll('globalThis.', 'var ');

    return str;
}

const build = (config?: any={}) => {
	const startTime = performance.now();

	return Bun.build({
		entrypoints: ['src/index.ts'],
		outdir: './dist',
	}).then(async (output) => {
		if (!output.success) {
			console.log(output);
			process.exit(1);
		}
		const {path} = output.outputs[0];
		let result = postProcess(await readFile(path, 'utf-8'));
		await Bun.write(
			path,
			await readFile('src/header.txt', 'utf-8') + result
		);
		console.log(`done in ${performance.now() - startTime} ms`);
	})
}

const config = {};
await build(config);

if (!process.argv.includes('--watch')) process.exit(0);

for await (const event of watch('./src', {recursive: true})) {
	const {filename} = event;
	console.log(filename)
	await build(config);
}
