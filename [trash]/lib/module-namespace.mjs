const {create, freeze, setPrototypeOf} = Object;

function ModuleNamespace() {}
const toPrimitive = () => 'ModuleNamespace';
const toString = () => 'class ModuleNamespace {}';
setPrototypeOf(toString, null);
setPrototypeOf(toPrimitive, null);

ModuleNamespace.prototype = create(null, {
  [Symbol.toPrimitive]: {value: toPrimitive, enumerable: false},
  [Symbol.toStringTag]: {value: 'ModuleNamespace', enumerable: false},
});

freeze(setPrototypeOf(ModuleNamespace, create(null, {toString: {value: toString}})));

// console.log({[ModuleNamespace]: ModuleNamespace});
// const moduleNamespace = new ModuleNamespace();
// console.log({[`${moduleNamespace}`]: moduleNamespace});

export default ModuleNamespace;
