const mode = 'ESM';

(async process => {
	const sources = {
		DEV: {ESM: './lib/modules.js'},
		DIST: {CJS: './dist/modules.js', ESM: './dist/modules.mjs'},
	};

	const source = (process
	? process.argv && process.argv.find(arg => /^--dev$|^-d$/i.test(arg))
	: typeof location === 'object' && location && /[?&]dev/i.test(location.search))
		? 'DEV'
		: 'DIST';

	const lib = sources[source] && sources[source][mode];
	const specs = './modules.spec.js';

	if (!lib) {
		return console.error('Cannot find a suitable %O source in %O format', source, mode);
		process && process.exit(1);
	}

	const importModule = mode === 'CJS' ? require : specifier => import(specifier);

	await importModule(lib);
	console.clear();
	console.log(`Running "${specs}" with "${lib}" — ${source} in ${mode}`);
	importModule(specs);
})(typeof process === 'object' && process);
