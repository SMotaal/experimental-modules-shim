/** @typedef {import('rollup').RollupDirOptions|import('rollup').RollupFileOptions} RollupBundleOptions */
/** @typedef {RollupBundleOptions['plugins'][number]} RollupPlugin */

const dirname = __dirname;

const SourceSpecifier = /\/lib\/(?=([^\/])\/|)(.*)$|/;

const defaults = {
	context: 'this',
	output: {sourcemap: true, preferConst: true},
};

const input = {
	collator: `${dirname}/lib/collator/collator.js`,
	modules: `${dirname}/lib/modules.js`,
};

export default /** @type {RollupBundleOptions[]} */ ([
	{
		...defaults,
		input: [`${dirname}/lib/collator/collator.js`, `${dirname}/lib/modules.js`],
		output: {
			...defaults.output,
			format: 'esm',
			entryFileNames: '[name].mjs',
			chunkFileNames: '[name].mjs',
			dir: `${dirname}/dist/`,
		},
		experimentalOptimizeChunks: true,
		// manualChunks: {modules: [`${dirname}/lib/modules.js`, `${dirname}/lib/environment.js`]},
	},
	{
		...defaults,
		input: input.modules,
		output: {
			...defaults.output,
			format: 'iife',
			file: `${dirname}/dist/modules.js`,
		},
	},
	{
		...defaults,
		input: input.modules,
		output: {
			...defaults.output,
			format: 'cjs',
			file: `${dirname}/legacy/modules.cjs`,
		},
	},
]);

// /** @type {Record<string, RollupBundleOptions} */
// const bundles = {
// 	modules: {
// 		input: {
// 			modules: `${dirname}/lib/modules.js`,
// 			collator: `${dirname}/lib/collator/collator.js`,
// 		},
// 		// external: [`${dirname}/lib/collator/*`],
// 		output: {dir: `${dirname}/dist/`},
// 		// plugins: [
// 		// 	/** @type {RollupPlugin} */ ({
// 		// 		resolveId(specifier, referrer) {
// 		// 			return SourceSpecifier.exec(specifier)[1] !== 'collator'
// 		// 				? null
// 		// 				: {id: this.getAssetFileName('collator'), external: true};
// 		// 		},
// 		// 	}),
// 		// ],
// 	},
// };

// // prettier-ignore //
// const bundle = (name, format = 'umd', filename = '', {output: {path, ...output} = {}, ...options} = bundles[name]) => {
// 	const bundle = {
// 		...defaults,
// 		...options,
// 		output: {
// 			...defaults.output,
// 			format,
// 			name,
// 			...output,
// 		},
// 	};
// 	if (format === 'umd' || format === 'iife') {
// 		const [, dir, entry, extension] = /^(.*?)([^\/]*?)(\..*)$/.exec(filename);
// 		bundle.input = bundle.input.modules;
// 		bundle.output.file = `${dir || path || `${dirname}/dist`}/${entry || name}${extension || '.js'}`;
// 		bundle.output.dir = undefined;
// 	} else {
//     bundle.output.assetFileNames = `[file].[ext]`
//   }
// 	return bundle;
// };

// export default [bundle('modules', 'es', '.mjs'), bundle('modules', 'iife', '.js')];

// // const resolver = (resolver => /** @type {RollupPlugin} */ ({
// // 	resolveId: (id, parent) => resolver.resolve(id, parent),
// // }))(
// // 	new (class ModuleResolver {
// // 		resolve(specifier, referrer) {
// //       if (!referrer) return specifier;
// //       const [,fromAspect] = SourceSpecifier.exec(specifier);
// //       if (!fromAspect) return specifier;
// //       const [,intoAspect] = SourceSpecifier.exec(referrer);
// //       if (!intoAspect || intoAspect === fromAspect) return specifier;
// //       return {id: `${dirname}/dist/${aspect}`, external: true};
// //     }
// // 	})(),
// // );

// // const paths = {
// // 	'dist/modules': `./modules`,
// // 	'dist/collator': `./collator`,
// // };

// // {
// // 	collator: bundle('collator', 'es', '.mjs'),
// // 	modules: bundle('modules', 'es', '.mjs'),
// // },
// // {
// // 	collator: bundle('collator', 'iife', '.js'),
// // 	modules: bundle('modules', 'iife', '.js'),
// // },
// // bundle('modules', 'iife', '.js'),
// // bundle('collator', 'es', '.mjs'),
// // bundle('collator', 'iife', '.js'),
// // collator: {
// // 	input: `${dirname}/lib/collator/collator.js`,
// // 	// external: [`${dirname}/lib/environment.js`],
// // 	output: {path: `${dirname}/dist`},
// // 	plugins: [
// // 		/** @type {RollupPlugin} */ ({
// // 			resolveId(specifier, referrer) {
// // 				return !referrer || SourceSpecifier.exec(referrer)[1] === 'collator'
// // 					? null
// // 					: {id: this.getAssetFileName('modules'), external: true};
// // 			},
// // 		}),
// // 	],
// // },
