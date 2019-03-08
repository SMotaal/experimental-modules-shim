((global, module, require) => {
	const {process, dynamicImport, document, location} = global;

	if (!dynamicImport) {
		let baseURL = null;
		const dynamicImport = async (specifier, referrer) => {
			dynamicImport.base ||
				(dynamicImport.base = `${(baseURL === null &&
					(baseURL =
						document && document.baseURI
							? `${new URL('./', document.baseURI)}`
							: location && location.href
							? `${new URL('./', location.href)}`
							: (module && module.filename && pathToFileURL(module.filename)) ||
							  (process &&
									process.cwd &&
									pathToFileURL(
										process.cwd().replace(/([/\\]?)$/, (m, i, s) => (m || /^[a-z]:\\/.test(s) ? '\\' : '/')),
									)) ||
							  currentFileURL())) ||
					''}`);
			referrer = referrer || dynamicImport.base || undefined;
			// console.log({specifier, referrer});
			const src = `${referrer ? new URL(specifier, referrer) : new URL(specifier)}`;
			if (!('import' in dynamicImport)) {
				try {
					dynamicImport.import = null;
					dynamicImport.import = (1, eval)(`async specifier => import(specifier)`);
				} catch (exception) {
					const promises = new Map();
					if (require) {
						dynamicImport.require = require;
						dynamicImport.import = (specifier, referrer = dynamicImport.base) => {
							let path, promise;
							(promise = promises.get(src)) ||
								promises.set(src, (promise = async () => dynamicImport.require(fileURLToPath(src))));
							return promise;
						};
					} else if (document && document.body && document.createElement) {
						const type = 'module';
						dynamicImport.import = (specifier, referrer = dynamicImport.base) => {
							let script, promise;
							(promise = promises.get(src)) ||
								promises.set(
									src,
									(promise = new Promise((onload, onerror) => {
										document.body.append(
											Object.assign((script = document.createElement('script')), {src, type, onload, onerror}),
										);
									})),
									// .then(() => new Promise(resolve => requestAnimationFrame(resolve)))
								);
							promise.finally(() => script && script.remove());
							return promise;
						};
					} else {
						dynamicImport.import = () => {
							throw exception;
						};
					}
				}
			}
			return dynamicImport.import(src);
		};

		if (module) {
			const prototype = Object.getPrototypeOf(module);
			prototype.import = {
				import(specifier) {
					const {filename, url: referrer = (module.url = pathToFileURL(filename))} = this;
					return dynamicImport(specifier, referrer);
				},
			}.import;

			module.exports = dynamicImport;
		}

		global.dynamicImport = dynamicImport;

		function pathToFileURL(path) {
			const WindowsPath = /^[a-z]:\\|^[^/]*\\(?![ \\])/;
			const WindowsSeparators = /\\/g;
			pathToFileURL = path =>
				WindowsPath.test(path) ? new URL(`file://${path.replace(WindowsSeparators, '/')}`) : new URL(path, 'file:///');
			return pathToFileURL(...arguments);
			// const WindowsAbsolutePath = /^[a-z]:\\/;
			// const WindowsRelativePath = /[.]{1,2}\\/;
		}

		function fileURLToPath(url) {
			const WindowsPathname = /^\/[a-z]:\//;
			const URLSeparators = /\//g;
			fileURLToPath = url => {
				const {protocol, pathname} = new URL(url);
				const path = decodeURIComponent(pathname);
				return WindowsPathname.test(path) ? path.slice(1).replace(URLSeparators, '\\') : path;
			};
			return fileURLToPath(...arguments);
		}

		function currentFileURL() {
			/* TEST:
			(async () => (await (1, eval)('{ (specifier) => import(specifier) }')(`data:text/javascript,export default Error('').stack`)).default)().catch(exception => Error('').stack).then(stack => `${stack}`.replace(/^[^]+?\n\s+(?:@|at .* [(](?=\S[^\n]+:\d+[)])|at (?=[^\n]+[^)](?:\n|$)))(\S[^\n]*?)(?:[:]\d+){2}[^]*$/, '$1')).then(console.log)
			*/
			const stack = `${Error('').stack}`;
			const filename =
				stack
					.replace(
						/^[^]+?\n\s+(?:@|at .* [(](?=\S[^\n]+:\d+[)])|at (?=[^\n]+[^)](?:\n|$)))(\S[^\n]*?)(?:[:]\d+){2}[^]*$/,
						'$1',
					)
					.trim()
					.replace(/^[^]*\n[^]*$/, '') || undefined;
			const url =
				(filename &&
					((/^(https?|file|data):/.test(filename) && new URL(filename)) ||
						(/[/\\]/.test(filename) && pathToFileURL(filename)))) ||
				undefined;
			return Object.assign((currentFileURL = url ? () => {} : () => url), {
				stack,
				filename,
				url: url && new URL(url),
			})();
		}
	}
})(
	(1, eval)('this'),
	(typeof module === 'object' && module) || undefined,
	(typeof require === 'function' && require) || undefined,
);
