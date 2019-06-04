//@ts-check

export const environment = (globalThis => {
	const environment = {};

	/** @type {Set<string>} */
	const warnings = new Set();

	/** @type {Globals} */
	//@ts-ignore
	environment.globalThis = globalThis;

	const warning = message => {
		warnings.add(message);
	};

	if (environment.globalThis || warning('No valid globalThis object in scope')) {
		const {globalThis, warnings} = environment;

		const globalProperties = ['global', 'window', 'self'];

		for (const globalProperty of globalProperties)
			globalProperty in globalThis &&
				globalThis[globalProperty] != null &&
				typeof globalThis[globalProperty] === 'object' &&
				(globalThis[globalProperty] === globalThis[globalProperty][globalProperty]
					? (environment[globalProperty] = globalThis[globalProperty])
					: warning(`An invalid ${globalProperty} was found in scope`));

		if (
			globalProperties.findIndex(property => property in environment) > -1 ||
			warning(`No valid ${globalProperties.join(', ')} object(s) in scope`)
		) {
			const {global, window, self, process} = environment.globalThis;

			if (environment.global !== undefined) {
				/** @type {Environment['global']} */
				environment.global = global;

				process == null ||
					typeof process.pid !== 'number' ||
					/** @type {Environment['process']} */
					(environment.process = process);
			}
			if (environment.self !== undefined) {
				/** @type {Environment['self']} */
				environment.self = self;

				if (environment.window !== undefined) {
					/** @type {Environment['window']} */
					environment.window = window;
					const {document} = window;
					document != null && document.defaultView === window && (environment.document = document);
				} else if (
					typeof self.ServiceWorkerGlobalScope === 'function' &&
					self instanceof self.ServiceWorkerGlobalScope
				) {
					/** @type {Environment['serviceWorker']} */
					//@ts-ignore
					environment.serviceWorker = self;
				} else if (
					typeof self.DedicatedWorkerGlobalScope === 'function' &&
					self instanceof self.DedicatedWorkerGlobalScope
				) {
					/** @type {Environment['worker']} */
					//@ts-ignore
					environment.worker = self;
				}
			}
			environment.global !== undefined && (environment.global = global);
		}
	}

	// warning('Not a warning');

	warnings.size && console.warn(['Runtime Warnings:', ...warnings].join('\n\t'));

	/** @type {typeof environment & Environment} */
	return environment;
})(typeof globalThis === 'object' && globalThis !== null && globalThis === globalThis.globalThis && globalThis);

/** @typedef {import('./types').environment.Environment} Environment */
/** @typedef {import('./types').environment.Globals} Globals */
