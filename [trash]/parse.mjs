import {matchers} from './lib/module-parser.mjs';

const modules = {
  esm: {
    helpers: `
const {defineProperty, getOwnPropertyDescriptor} = Reflect;

export const noop = () => {};

export const define = (target, property, value, enumerable = false, configurable = false) =>
  defineProperty(target, property, {value, enumerable, configurable}) && value;

export const bind = (target, property, get, enumerable = false, configurable = false) =>
  defineProperty(target, property, {get, set: noop, configurable, enumerable});

export const copy = (target, source, identifier, alias = identifier) =>
  defineProperty(target, alias, getOwnPropertyDescriptor(source, identifier));
  `,
  },
};

const results = {};

for (const syntax in modules) {
  const files = modules[syntax];
  const matcher = matchers[syntax];

  if (!matcher) continue;

  for (const file in files) {
    const id = `${syntax}:${file}`;
    const source = files[file];
    const matches = [];
    const result = (results[id] = {matches});

    matcher.lastIndex = null;

    let match;
    while ((match = matcher.exec(source))) {
      matches.push(match);
    }

    // console.log('%O:%O: %o', syntax, file, matches);
    console.group('%O:%O', syntax, file);
    matches.map(m => console.log(m));
    console.groupEnd();
  }
}

// const markup = require('../packages/markup.js');
// console.log(markup);
