//@ts-check
/// <reference path="./types.d.ts" />

import {tokenizer} from '../../../markup/dist/tokenizer.es.js';
// import {tokenizer} from '../../../markup/experimental/es/standalone.js';

/** @param {string} text @returns {TokenizerTokens} */
export const tokenizeSourceText = text => tokenizer.tokenize(text, {console});
