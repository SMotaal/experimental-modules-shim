// @ts-check
/// <reference no-default-lib="true"/>
/// <reference types="@types/node"/>
/// <reference lib="dom"/>
/// <reference lib="webworker"/>

/// Environment ////////////////////////////////////////////////////////////////

export namespace environment {
	export interface Globals {
		globalThis: this;
	}

	export interface Environment {}

	export interface GlobalObject extends standard.GlobalObject, Globals {}

	export type globalThis = GlobalObject;
}

/// Modules ////////////////////////////////////////////////////////////////////
export namespace modules {
	export interface GlobalScope extends GlobalObject {}
	export interface ModuleScope extends GlobalScope {}

	export interface Module {
		readonly url: string;
		readonly evaluator?: Module.Evaluator;
		readonly scope?: Module.Scope;
		readonly context?: Module.Context;
		readonly instance?: Module.Instance;
		readonly namespace?: Module.Namespace;
		readonly bindings?: Module.Bindings;
		readonly links?: Module.Links;
	}

	export namespace Module {
		export interface Evaluator {
			(): Promise<Module.Namespace> | Module.Namespace;
			(module: Module, scope: Scope): Promise<Module.Namespace> | Module.Namespace;
		}

		export interface Meta {
			url: string;
		}

		export interface Namespace {
			[name: string]: unknown;
		}

		export interface Bindings extends Namespace {
			module?: Module;
		}

		export interface Links {
			[name: string]: Link;
		}

		export interface Link {
			intent: 'import' | 'export';
			identifier: string;
			binding: string;
			specifier: string;
			url?: string;
		}

		export interface Scope extends GlobalScope, Bindings {
			meta?: Meta;
		}

		export interface Context {
			scope: Scope;
			meta: Meta;
			namespace: Namespace;
		}

		export interface Instance {
			namespace: Namespace;
			context: Context;
		}

		export interface Exports {
			(...exports: (() => unknown)[]): void;
			default: unknown;
		}
	}

	export interface Modules {
		ModuleScope: ModuleScope;
		DynamicModule: DynamicModuleConstructor;
	}

	export interface Namespaces {
		[name: string]: Module.Namespace;
		import(url: string): Module.Namespace;
	}

	export type DynamicModule = import('./dynamic-module').DynamicModule;

	export type DynamicModuleConstructor = typeof import('./dynamic-module').DynamicModule;

	export namespace DynamicModule {
		export interface Evaluator extends Module.Evaluator {
			(module: Context, exports: Exports): Generator<void>;
			sourceText: string;
			compiledText: string;
			moduleURL: string;
			links: Module.Links;
		}
	}
}

export namespace environment {
	export interface Globals {
		DynamicModules: modules.Modules;
	}

	export interface Environment {
		serviceWorker: browser.serviceWorker;
		worker: browser.worker;
		window: browser.window;
		modules: modules;
	}

	export type modules = modules.Modules;
}

/// Browser ////////////////////////////////////////////////////////////////////
export namespace environment {
	export interface Globals {
		self: browser.self;
		window: browser.window;
		document: browser.window;
		registration: browser.registration;
		navigator: browser.navigator;
		location: browser.location;
	}

	export interface Environment {
		serviceWorker: browser.serviceWorker;
		worker: browser.worker;
		window: browser.window;
		self: browser.self;
	}

	export type browser = browser.GlobalObject;

	export namespace browser {
		export type self = browser.GlobalObject;
		export type window = browser.window.GlobalObject;
		export type serviceWorker = serviceWorker.GlobalObject;
		export type worker = worker.GlobalObject;
		export type document = Document;
		export type registration = platform.browser.ServiceWorkerGlobals['registration'];
		export type navigator = platform.browser.GlobalObject['navigator'];
		export type location = platform.browser.GlobalObject['location'];

		export interface GlobalObject extends environment.GlobalObject, platform.browser.GlobalObject {}

		export interface Document extends platform.browser.Document {
			defaultView: window.GlobalObject;
		}

		export namespace window {
			export interface GlobalObject extends environment.GlobalObject, platform.browser.WindowGlobalObject {
				document: Document;
			}
		}
		export namespace serviceWorker {
			export interface GlobalObject extends environment.GlobalObject, platform.browser.ServiceWorkerGlobalObject {}
		}
		export namespace worker {
			export interface GlobalObject extends environment.GlobalObject, platform.browser.WorkerGlobalObject {}
		}
	}
}

export namespace platform.browser {
	export interface GlobalObject extends standard.Globals, Globals {}

	export interface WindowGlobalObject extends standard.Globals, WindowGlobals {}
	export interface ServiceWorkerGlobalObject extends standard.Globals, ServiceWorkerGlobals {}
	export interface WorkerGlobalObject extends standard.Globals, WorkerGlobals {}

	export interface WindowOrWorkerGlobals extends Pick<WindowOrWorkerGlobalScope, GlobalObject.WindowOrWorkerProperty> {
		Window: typeof Window;
		DedicatedWorkerGlobalScope: typeof DedicatedWorkerGlobalScope;
		ServiceWorkerGlobalScope: typeof ServiceWorkerGlobalScope;
		WindowOrWorkerGlobalScope: typeof WindowOrWorkerGlobalScope;
	}

	export interface WindowGlobals extends Pick<Window, GlobalObject.WindowProperty>, WindowOrWorkerGlobals {}
	// /* TEST: */ type x = WindowGlobals['']

	export interface ServiceWorkerGlobals
		extends Pick<ServiceWorkerGlobalScope, GlobalObject.ServiceWorkerProperty>,
			WindowOrWorkerGlobals {}

	// /* TEST: */ type x = ServiceWorkerGlobals['']

	export interface WorkerGlobals
		extends Pick<DedicatedWorkerGlobalScope, GlobalObject.WorkerProperty>,
			WindowOrWorkerGlobals {}
	// /* TEST: */ type x = WorkerGlobals['']

	export interface Globals extends WindowGlobals, ServiceWorkerGlobals, WorkerGlobals, WindowOrWorkerGlobals {}

	// /* TEST: */ type x = Globals['']

	export {Document};

	export namespace GlobalObject {
		export type Property = WindowProperty | ServiceWorkerProperty | WorkerProperty | WindowOrWorkerProperty;
		export type WindowOrWorkerProperty =
			| 'WindowOrWorkerGlobalScope'
			| Exclude<keyof WindowOrWorker, standard.GlobalObject.Property>;
		export type WindowProperty = 'Window' | Exclude<keyof Window, standard.GlobalObject.Property>;
		export type ServiceWorkerProperty =
			| 'ServiceWorkerGlobalScope'
			| Exclude<keyof ServiceWorkerGlobalScope, standard.GlobalObject.Property>;
		export type WorkerProperty =
			| 'DedicatedWorkerGlobalScope'
			| Exclude<keyof DedicatedWorkerGlobalScope, standard.GlobalObject.Property>;
	}
}

/// NodeJS /////////////////////////////////////////////////////////////////////
export namespace environment {
	export interface Globals {
		// /** @deprecated */ GLOBAL: this['global'];
		// /** @deprecated */ root: this['global'];
		global: environment.node.global;
		process: environment.node.process;
	}

	export interface Environment {
		// serviceWorker: browser.serviceWorker;
		// worker: browser.worker;
		global: environment.node.global;
		process: environment.node.process;
	}

	export type node = node.GlobalObject;

	export namespace node {
		export type global = GlobalObject;
		export type process = global['process'];

		export interface GlobalObject extends standard.GlobalObject, NodeJS.Global, Globals {}
	}
}

export namespace platform.node {
	export interface GlobalObject extends standard.Globals, Globals {}

	export interface Globals extends GlobalScope {}
	export interface GlobalScope extends Pick<NodeJS.Global, platform.node.GlobalObject.GlobalProperty> {}
	export interface LegacyModuleScope extends Pick<NodeJS.Global, platform.node.GlobalObject.LegacyModuleProperty> {}

	// /* TEST: */ type x = Globals['']

	export namespace GlobalObject {
		export type Property = GlobalProperty;
		export type GlobalProperty = Exclude<keyof NodeJS.Global, standard.GlobalObject.Property | LegacyModuleProperty>;
		export type LegacyModuleProperty = '__filename' | '__dirname' | 'require' | 'exports' | 'module';
	}
}

/// ECMAScript /////////////////////////////////////////////////////////////////

export namespace standard {
	export interface GlobalObject extends Globals {}
	export interface Globals extends Pick<WindowOrWorkerGlobalScope, standard.GlobalObject.Property> {}

	// /* TEST: */ type x = Globals['']

	export namespace GlobalObject {
		export type Property = ValueProperty | FunctionProperty | ConstructorProperty | NamespaceProperty;

		export type ValueProperty = 'Infinity' | 'NaN' | 'undefined';
		export interface Values extends Pick<WindowOrWorkerGlobalScope, ValueProperty> {}

		// export type StandardProperty =
		//   | FunctionProperty
		//   | ValueProp

		export type FunctionProperty =
			| 'eval'
			| 'isFinite'
			| 'isNaN'
			| 'parseFloat'
			| 'parseInt'
			| 'decodeURI'
			| 'decodeURIComponent'
			| 'encodeURI'
			| 'encodeURIComponent';

		export interface Functions extends Pick<WindowOrWorkerGlobalScope, FunctionProperty> {}

		export type ConstructorProperty =
			| 'Array'
			| 'ArrayBuffer'
			| 'Boolean'
			| 'DataView'
			| 'Date'
			| 'Error'
			| 'EvalError'
			| 'Float32Array'
			| 'Float64Array'
			| 'Function'
			| 'Int8Array'
			| 'Int16Array'
			| 'Int32Array'
			| 'Map'
			| 'Number'
			| 'Object'
			| 'Promise'
			| 'Proxy'
			| 'RangeError'
			| 'ReferenceError'
			| 'RegExp'
			| 'Set'
			| 'SharedArrayBuffer'
			| 'String'
			| 'Symbol'
			| 'SyntaxError'
			| 'TypeError'
			| 'Uint8Array'
			| 'Uint8ClampedArray'
			| 'Uint16Array'
			| 'Uint32Array'
			| 'URIError'
			| 'WeakMap'
			| 'WeakSet';

		export interface Constructors extends Pick<WindowOrWorkerGlobalScope, ConstructorProperty> {}

		export type NamespaceProperty = 'Atomics' | 'JSON' | 'Math' | 'Reflect';

		export interface Namespaces extends Pick<WindowOrWorkerGlobalScope, NamespaceProperty> {}
	}
}
// namespace DynamicModules {
// 	interface ModuleScope extends globalThis[''] {}
// }

// interface Environment {
// 	// modules: import('./modules.js')
// }

// interface Environment {
// 	window: Window;
// 	serviceWorker: ServiceWorkerGlobals;
// 	webWorker: WorkerGlobals;
// 	document: environment.window['document'];
// 	globalThis: environment.self | environment.global;
// 	self: environment.window | environment.serviceWorker | environment.webWorker;
// }

// interface Environment {
// 	global: NodeJS.Global;
// 	process: NodeJS.Process;
// }

// {
// 	[k in platform.browser.GlobalObject.Property]: k extends keyof BrowserGlobals
// 		? BrowserGlobals[k]
// 		: k extends platform.browser.GlobalObject.WindowProperty
// 		? Window[k]
// 		: k extends platform.browser.GlobalObject.ServiceWorkerProperty
// 		? ServiceWorkerGlobalScope[k]
// 		: k extends platform.browser.GlobalObject.WorkerProperty
// 		? WorkerGlobalScope[k]
// 		: unknown
// };
