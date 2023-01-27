/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2016-2019 Mickael Jeanroy
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
'use strict';

var _ = require('lodash');
/**
 * Check if given value is a `string`.
 *
 * @param {*} value The value to check.
 * @return {boolean} `true` if `value` is a string, `false` otherwise.
 */


function isString(value) {
  return _.isString(value);
}
/**
 * Check if given value is a `boolean`.
 *
 * @param {*} value The value to check.
 * @return {boolean} `true` if `value` is a boolean, `false` otherwise.
 */


function isBoolean(value) {
  return _.isBoolean(value);
}
/**
 * Check if given value is a `function`.
 *
 * @param {*} value The value to check.
 * @return {boolean} `true` if `value` is a function, `false` otherwise.
 */


function isFunction(value) {
  return _.isFunction(value);
}
/**
 * Check if given value is a `number`.
 *
 * @param {*} value The value to check.
 * @return {boolean} `true` if `value` is a number, `false` otherwise.
 */


function isNumber(value) {
  return _.isNumber(value);
}
/**
 * Check if given value is `null` or `undefined`.
 *
 * @param {*} value The value to check.
 * @return {boolean} `true` if `value` is `null` or `undefined`, `false` otherwise.
 */


function isNil(value) {
  return _.isNil(value);
}
/**
 * Check if given value is an `array`.
 *
 * @param {*} value The value to check.
 * @return {boolean} `true` if `value` is an array, `false` otherwise.
 */


function isArray(value) {
  return _.isArray(value);
}
/**
 * Check if given value is an plain object.
 *
 * @param {*} value The value to check.
 * @return {boolean} `true` if `value` is a plain object, `false` otherwise.
 */


function isObject(value) {
  return _.isObject(value) && !isArray(value) && !isFunction(value) && !isNil(value) && !isString(value) && !isNumber(value);
}

module.exports = {
  string: function string() {
    return {
      type: 'object.type.string',
      message: 'must be a string',
      schema: null,
      test: isString
    };
  },
  "boolean": function boolean() {
    return {
      type: 'object.type.boolean',
      message: 'must be a boolean',
      schema: null,
      test: isBoolean
    };
  },
  func: function func() {
    return {
      type: 'object.type.func',
      message: 'must be a function',
      schema: null,
      test: isFunction
    };
  },
  object: function object(schema) {
    return {
      type: 'object.type.object',
      message: 'must be an object',
      schema: schema,
      test: isObject
    };
  },
  array: function array(schema) {
    return {
      type: 'object.type.array',
      message: 'must be an array',
      schema: schema,
      test: isArray
    };
  },
  any: function any() {
    return {
      type: 'object.any',
      message: null,
      schema: null,
      test: function test() {
        return true;
      }
    };
  }
};