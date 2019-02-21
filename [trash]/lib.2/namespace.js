import {createObject, freeze, setPrototypeOf} from './helpers.js';

export function ModuleNamespace() {}
{
	const toPrimitive = setPrototypeOf(() => 'ModuleNamespace', null);
	const toString = setPrototypeOf(() => 'class ModuleNamespace {}', null);
	ModuleNamespace.prototype = createObject(null, {
		[Symbol.toPrimitive]: {value: toPrimitive, enumerable: false},
		[Symbol.toStringTag]: {value: 'ModuleNamespace', enumerable: false},
	});
	freeze(setPrototypeOf(ModuleNamespace, createObject(null, {toString: {value: toString}})));
}
