import {create, freeze, setPrototypeOf} from './helpers.mjs';

export function ModuleNamespace() {}
{
  const toPrimitive = setPrototypeOf(() => 'ModuleNamespace', null);
  const toString = setPrototypeOf(() => 'class ModuleNamespace {}', null);
  ModuleNamespace.prototype = create(null, {
    [Symbol.toPrimitive]: {value: toPrimitive, enumerable: false},
    [Symbol.toStringTag]: {value: 'ModuleNamespace', enumerable: false},
  });
  freeze(setPrototypeOf(ModuleNamespace, create(null, {toString: {value: toString}})));
}
