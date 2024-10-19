#!/usr/bin/env bun
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { sys } from "typescript";
// @ts-ignore
import txtScriptHeader from "./src/assets/header_script.txt" with { type: "text" };
// @ts-ignore
import txtScriptHeaderLite from "./src/assets/header_script.lite.txt" with { type: "text" };
// @ts-ignore
import txtMetaHeader from "./src/assets/header_meta.txt" with { type: "text" };
import { assert } from "node:console";
import { ESLint } from "eslint";

enum BuildTarget {
    ALL = 'all',
    ANDROID_APP = 'android-app',
    MOBILE = 'mobile',
    WEBOS = 'webos',
}

type BuildVariant = 'full' | 'lite';

const MINIFY_SYNTAX = true;

const postProcess = (str: string): string => {
    // Unescape unicode charaters
    str = unescape((str.replace(/\\u/g, '%u')));
    // Replace \x00 to normal character
    str = str.replaceAll(/\\x[A-F0-9]{2}/g, (e) => String.fromCharCode(parseInt(e.substring(2), 16)));

    // Replace "globalThis." with "var";
    str = str.replaceAll('globalThis.', 'var ');

    // Remove enum's inlining comments
    str = str.replaceAll(/ \/\* [A-Z0-9_]+ \*\//g, '');
    str = str.replaceAll('/* @__PURE__ */ ', '');

    // Remove comments from import
    str = str.replaceAll(/\/\/ src.*\n/g, '');

    // Add ADDITIONAL CODE block
    str = str.replace('var DEFAULT_FLAGS', '\n/* ADDITIONAL CODE */\n\nvar DEFAULT_FLAGS');

    str = str.replaceAll('(e) => `', 'e => `');

    // Simplify object definitions
    // {[1]: "a"} => {1: "a"}
    str = str.replaceAll(/\[(\d+)\]: /g, '$1: ');
    // {["a"]: 1, ["b-c"]: 2} => {a: 1, "b-c": 2}
    str = str.replaceAll(/\["([^"]+)"\]: /g, function(match, p1) {
        if (p1.includes('-') || p1.match(/^\d/)) {
            p1 = `"${p1}"`;
        }

        return p1 + ': ';
    });

    // Minify SVG import code
    const svgMap = {}
    str = str.replaceAll(/var ([\w_]+) = ("<svg.*?");\n\n/g, (match, p1, p2) => {
        // Remove new lines in SVG
        p2 = p2.replaceAll(/\\n*\s*/g, '');

        svgMap[p1] = p2;
        return '';
    });

    for (const name in svgMap) {
        str = str.replace(`: ${name}`, `: ${svgMap[name]}`);
    }

    // Collapse empty brackets
    str = str.replaceAll(/\{[\s\n]+\}/g, '{}');

    // Remove blank lines
    str = str.replaceAll(/\n([\s]*)\n/g, "\n");

    // Minify WebGL shaders & JS strings
    // Replace "\n     " with "\n"
    str = str.replaceAll(/\\n+\s*/g, '\\n');
    // Remove comment line
    str = str.replaceAll(/\\n\/\/.*?(?=\\n)/g, '');

    // Replace ${"time".toUpperCase()} with "TIME"
    str = str.replaceAll(/\$\{"([^"]+)"\.toUpperCase\(\)\}/g, (match, p1) => {
        return p1.toUpperCase();
    });

    // Replace " (e) =>" to " e =>"
    // str = str.replaceAll(/ \(([^\s,.$()]+)\) =>/g, ' $1 =>');

    // Set indent to 1 space
    if (MINIFY_SYNTAX) {
        // Collapse if/else blocks without curly braces
        str = str.replaceAll(/((if \(.*?\)|else)\n\s+)/g, '$2 ');

        str = str.replaceAll(/\n(\s+)/g, (match, p1) => {
            const len = p1.length / 2;
            return '\n' + ' '.repeat(len);
        });
    }

    assert(str.includes('/* ADDITIONAL CODE */'));
    assert(str.includes('window.BX_EXPOSED = BxExposed'));
    assert(str.includes('window.BxEvent = BxEvent'));
    assert(str.includes('window.BX_FETCH = window.fetch'));

    return str;
}

const build = async (target: BuildTarget, version: string, variant: BuildVariant, config: any={}) => {
    console.log('-- Target:', target);
    const startTime = performance.now();

    let outputScriptName = 'better-xcloud';
    if (target !== BuildTarget.ALL) {
        outputScriptName += `.${target}`;
    }

    if (variant !== 'full') {
        outputScriptName += `.${variant}`;
    }

    let outputMetaName = outputScriptName;
    outputScriptName += '.user.js';
    outputMetaName += '.meta.js';

    const outDir = './dist';

    let output = await Bun.build({
        entrypoints: ['src/index.ts'],
        outdir: outDir,
        naming: outputScriptName,
        minify: {
            syntax: MINIFY_SYNTAX,
        },
        define: {
            'Bun.env.BUILD_TARGET': JSON.stringify(target),
            'Bun.env.BUILD_VARIANT': JSON.stringify(variant),
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
    let scriptHeader: string;
    if (variant === 'full') {
        scriptHeader = txtScriptHeader;
    } else {
        scriptHeader = txtScriptHeaderLite;
    }
    scriptHeader = scriptHeader.replace('[[VERSION]]', version);

    // Save to script
    await Bun.write(path, scriptHeader + result);

    // Create meta file (don't build if it's beta version)
    if (!version.includes('beta') && variant === 'full') {
        await Bun.write(outDir + '/' + outputMetaName, txtMetaHeader.replace('[[VERSION]]', version));
    }

    // Check with ESLint
    const eslint = new ESLint();
    const results = await eslint.lintFiles([path]);
    results[0].messages.forEach((msg: any) => {
        console.error(`${path}#${msg.line}: ${msg.message}`);
    });

    console.log(`---- [${target}] done in ${performance.now() - startTime} ms`);
    console.log(`---- [${target}] ${new Date()}`);
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

        variant: {
            type: 'string',
            default: 'full',
        },
    },
    strict: true,
    allowPositionals: true,
}) as {
    values: {
        version: string,
        variant: BuildVariant,
    },
    positionals: string[],
};

if (!values['version']) {
    console.log('Missing --version param');
    sys.exit(-1);
}

if (values['variant'] !== 'full' && values['variant'] !== 'lite') {
    console.log('--variant param must be either "full" or "lite"');
    sys.exit(-1);
}

async function main() {
    const config = {};
    console.log(`Building: VERSION=${values['version']}, VARIANT=${values['variant']}`);
    for (const target of buildTargets) {
        await build(target, values['version']!!, values['variant'], config);
    }

    console.log('')
    // console.log('\n** Press Enter to build or Esc to exit');
}

function onKeyPress(data: any) {
    const keyCode = data[0];
    if (keyCode === 13) {  // Enter key
        main();
    } else if (keyCode === 27) {  // Esc key
        process.exit(0);
    }
}

main();

/*
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on('data', onKeyPress);
*/
