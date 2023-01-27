"use strict";

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
var spdxExpressionValidate = require('spdx-expression-validate');

var spdxSatisfies = require('spdx-satisfies');
/**
 * Normalize license name:
 * - Returns `UNLICENSED` for nil parameter.
 * - Trim license value.
 *
 * @param {string} license The license name.
 * @return {string} The normalized license name.
 */


function normalizeLicense(license) {
  if (!license) {
    return 'UNLICENSED';
  }

  return license.trim();
}
/**
 * Check if given license name is the `UNLICENSED` value.
 *
 * @param {string} license The license to check.
 * @return {boolean} `true` if `license` is the UNLICENSED one, `false` otherwise.
 */


function checkUnlicensed(license) {
  return license.toUpperCase() === 'UNLICENSED';
}
/**
 * Check if dependency is unlicensed, or not.
 *
 * @param {Object} dependency The dependency.
 * @return {boolean} `true` if dependency does not have any license, `false` otherwise.
 */


function isUnlicensed(dependency) {
  var license = normalizeLicense(dependency.license);
  return checkUnlicensed(license);
}
/**
 * Check if license dependency is valid according to given SPDX validator pattern.
 *
 * @param {Object} dependency The dependency.
 * @param {string} allow The validator as a SPDX pattern.
 * @return {boolean} `true` if dependency license is valid, `false` otherwise.
 */


function isValid(dependency, allow) {
  var license = normalizeLicense(dependency.license);

  if (checkUnlicensed(license)) {
    return false;
  }

  return spdxExpressionValidate(license) && spdxSatisfies(license, allow);
}

module.exports = {
  isUnlicensed: isUnlicensed,
  isValid: isValid
};