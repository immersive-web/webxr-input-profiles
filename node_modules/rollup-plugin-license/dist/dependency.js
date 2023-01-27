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

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var _ = require('lodash');

var EOL = require('./eol.js');

var Person = require('./person.js');
/**
 * Dependency structure.
 */


module.exports =
/*#__PURE__*/
function () {
  /**
   * Create new dependency from package description.
   *
   * @param {Object} pkg Package description.
   * @constructor
   */
  function Dependency(pkg) {
    _classCallCheck(this, Dependency);

    this.name = pkg.name || null;
    this.maintainers = pkg.maintainers || [];
    this.version = pkg.version || null;
    this.description = pkg.description || null;
    this.repository = pkg.repository || null;
    this.homepage = pkg.homepage || null;
    this["private"] = pkg["private"] || false;
    this.license = pkg.license || null;
    this.licenseText = pkg.licenseText || null; // Parse the author field to get an object.

    this.author = pkg.author ? new Person(pkg.author) : null; // Parse the contributor array.

    this.contributors = _.map(_.castArray(pkg.contributors || []), function (contributor) {
      return new Person(contributor);
    }); // The `licenses` field is deprecated but may be used in some packages.
    // Map it to a standard license field.

    if (!this.license && pkg.licenses) {
      // Map it to a valid license field.
      // See: https://docs.npmjs.com/files/package.json#license
      this.license = "(".concat(_.chain(pkg.licenses).map(function (license) {
        return license.type || license;
      }).join(' OR ').value(), ")");
    }
  }
  /**
   * Serialize dependency as a string.
   *
   * @return {string} The dependency correctly formatted.
   */


  _createClass(Dependency, [{
    key: "text",
    value: function text() {
      var lines = [];
      lines.push("Name: ".concat(this.name));
      lines.push("Version: ".concat(this.version));
      lines.push("License: ".concat(this.license));
      lines.push("Private: ".concat(this["private"]));

      if (this.description) {
        lines.push("Description: ".concat(this.description || false));
      }

      if (this.repository) {
        lines.push("Repository: ".concat(this.repository.url));
      }

      if (this.homepage) {
        lines.push("Homepage: ".concat(this.homepage));
      }

      if (this.author) {
        lines.push("Author: ".concat(this.author.text()));
      }

      if (!_.isEmpty(this.contributors)) {
        lines.push("Contributors:");

        var allContributors = _.chain(this.contributors).map(function (contributor) {
          return contributor.text();
        }).map(function (line) {
          return "  ".concat(line);
        }).value();

        lines.push.apply(lines, _toConsumableArray(allContributors));
      }

      if (this.licenseText) {
        lines.push('License Copyright:');
        lines.push('===');
        lines.push('');
        lines.push(this.licenseText);
      }

      return lines.join(EOL);
    }
  }]);

  return Dependency;
}();