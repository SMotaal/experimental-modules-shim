import {create, freeze, setPrototypeOf} from './helpers.js';
import {Object} from '../../../packages/tools/common/helpers.js';

export function ModuleNamespace() {}
{
	const toPrimitive = setPrototypeOf(() => 'ModuleNamespace', null);
	const toString = setPrototypeOf(() => 'class ModuleNamespace {}', null);
	const {toJSON} = {
		toJSON() {
			return Object.getOwnPropertyNames(this);
		},
	};
	ModuleNamespace.prototype = create(null, {
		[Symbol.toPrimitive]: {value: toPrimitive, enumerable: false},
		[Symbol.toStringTag]: {value: 'ModuleNamespace', enumerable: false},
		toJSON: {value: toJSON, enumerable: false},
	});
	freeze(setPrototypeOf(ModuleNamespace, create(null, {toString: {value: toString}})));
}
