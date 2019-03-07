import {ModuleScope, GlobalScope} from './scope.js';
import {DynamicModule} from './dynamic-module.js';

GlobalScope.DynamicModules
	? 'DynamicModule' in GlobalScope.DynamicModules ||
	  ((GlobalScope.DynamicModules.ModuleScope = ModuleScope), (GlobalScope.DynamicModules.DynamicModule = DynamicModule))
	: (GlobalScope.DynamicModules = {ModuleScope, GlobalScope});
