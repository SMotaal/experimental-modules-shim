import {ModuleScope, GlobalScope} from './scope.js';
import {DynamicModule} from './dynamic-module.js';

GlobalScope.DynamicModules = {
	ModuleScope,
	Module: DynamicModule,
};
