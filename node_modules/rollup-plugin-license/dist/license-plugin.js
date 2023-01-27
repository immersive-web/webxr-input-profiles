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

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var fs = require('fs');

var path = require('path');

var mkdirp = require('mkdirp');

var _ = require('lodash');

var moment = require('moment');

var MagicString = require('magic-string');

var glob = require('glob');

var Dependency = require('./dependency.js');

var generateBlockComment = require('./generate-block-comment.js');

var licensePluginOptions = require('./license-plugin-option.js');

var licenseValidator = require('./license-validator');

var PLUGIN_NAME = require('./license-plugin-name.js');

var EOL = require('./eol.js');
/**
 * Pre-Defined comment style:
 *
 * - `regular` stands for "classic" block comment.
 * - `ignored` stands for block comment starting with standard prefix ignored by minifier.
 * - `slash` stands for "inline" style (i.e `//`).
 * - `none` stands for no comment style at all.
 *
 * @type {Object<string, Object>}
 */


var COMMENT_STYLES = {
  regular: {
    start: '/**',
    body: ' *',
    end: ' */'
  },
  ignored: {
    start: '/*!',
    body: ' *',
    end: ' */'
  },
  slash: {
    start: '//',
    body: '//',
    end: '//'
  },
  none: null
};
/**
 * Compute the comment style to use for given text:
 * - If text starts with a block comment, nothing is done (i.e use `none`).
 * - Otherwise, use the `regular` style.
 *
 * @param {string} text The text to comment.
 * @return {string} The comment style name.
 */

function computeDefaultCommentStyle(text) {
  var trimmedText = text.trim();
  var start = trimmedText.slice(0, 3);
  var startWithComment = start === '/**' || start === '/*!';
  return startWithComment ? 'none' : 'regular';
}
/**
 * Rollup Plugin.
 * @class
 */


var LicensePlugin =
/*#__PURE__*/
function () {
  /**
   * Initialize plugin.
   *
   * @param {Object} options Plugin options.
   */
  function LicensePlugin() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, LicensePlugin);

    // Plugin name, used by rollup.
    this.name = PLUGIN_NAME; // Initialize main options.

    this._options = options;
    this._cwd = this._options.cwd || process.cwd();
    this._dependencies = {};
    this._pkg = require(path.join(this._cwd, 'package.json'));
    this._debug = this._options.debug || false; // SourceMap can now be disable/enable on the plugin.

    this._sourcemap = this._options.sourcemap !== false; // This is a cache storing a directory path to associated package.
    // This is an improvement to avoid looking for package information for
    // already scanned directory.

    this._cache = {};
  }
  /**
   * Enable source map.
   *
   * @return {void}
   */


  _createClass(LicensePlugin, [{
    key: "disableSourceMap",
    value: function disableSourceMap() {
      this._sourcemap = false;
    }
    /**
     * Hook triggered by `rollup` to load code from given path file.
     *
     * This hook is used here to analyze a JavaScript file to extract
     * associated `package.json` file and store the main information about
     * it (license, author, etc.).
     *
     * This method is used to analyse all the files added to the final bundle
     * to extract license informations.
     *
     * @param {string} id Module identifier.
     * @return {void}
     */

  }, {
    key: "scanDependency",
    value: function scanDependency(id) {
      var _this = this;

      if (id.startsWith('\0')) {
        id = id.replace(/^\0/, '');
        this.debug("scanning internal module ".concat(id));
      }

      this.debug("scanning ".concat(id)); // Look for the `package.json` file

      var dir = path.parse(id).dir;
      var pkg = null;
      var scannedDirs = [];

      while (dir && dir !== this._cwd) {
        // Try the cache.
        if (_.has(this._cache, dir)) {
          pkg = this._cache[dir];

          if (pkg) {
            this.debug("found package.json in cache (package: ".concat(pkg.name, ")"));
            this.addDependency(pkg);
          }

          break;
        }

        scannedDirs.push(dir);
        var pkgPath = path.join(dir, 'package.json');
        var exists = fs.existsSync(pkgPath);

        if (exists) {
          this.debug("found package.json at: ".concat(pkgPath, ", read it")); // Read `package.json` file

          pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')); // Read license file, if it exists.

          var licenseFile = glob.sync(path.join(dir, 'LICENSE*'))[0];

          if (licenseFile) {
            pkg.licenseText = fs.readFileSync(licenseFile, 'utf-8');
          } // Add the new dependency to the set of third-party dependencies.


          this.addDependency(pkg); // We can stop now.

          break;
        } // Go up in the directory tree.


        dir = path.normalize(path.join(dir, '..'));
      } // Update the cache


      _.forEach(scannedDirs, function (scannedDir) {
        _this._cache[scannedDir] = pkg;
      });
    }
    /**
     * Hook triggered by `rollup` to load code from given path file.
     *
     * @param {Object} dependencies List of modules included in the final bundle.
     * @return {void}
     */

  }, {
    key: "scanDependencies",
    value: function scanDependencies(dependencies) {
      var _this2 = this;

      this.debug("Scanning: ".concat(dependencies));

      _.forEach(dependencies, function (dependency) {
        _this2.scanDependency(dependency);
      });
    }
    /**
     * Hook triggered by `rollup` to transform the final generated bundle.
     * This hook is used here to prepend the license banner to the final bundle.
     *
     * @param {string} code The bundle content.
     * @param {boolean} sourcemap If sourcemap must be generated.
     * @return {Object} The result containing the code and, optionnally, the source map
     *                  if it has been enabled (using `enableSourceMap` method).
     */

  }, {
    key: "prependBanner",
    value: function prependBanner(code, sourcemap) {
      // Create a magicString: do not manipulate the string directly since it
      // will be used to generate the sourcemap.
      var magicString = new MagicString(code);
      var banner = this._options.banner;

      var content = this._readBanner(banner);

      if (content) {
        magicString.prepend(EOL);
        magicString.prepend(this._generateBanner(content, banner));
      }

      var result = {
        code: magicString.toString()
      };

      if (this._sourcemap !== false && sourcemap !== false) {
        result.map = magicString.generateMap({
          hires: true
        });
      }

      return result;
    }
    /**
     * Add new dependency to the bundle descriptor.
     *
     * @param {Object} pkg Dependency package information.
     * @return {void}
     */

  }, {
    key: "addDependency",
    value: function addDependency(pkg) {
      var name = pkg.name;

      if (!_.has(this._dependencies, name)) {
        this._dependencies[name] = new Dependency(pkg);
      }
    }
    /**
     * Scan third-party dependencies, and:
     * - Warn for license violations.
     * - Generate summary.
     *
     * @param {boolean} includePrivate Flag that can be used to include / exclude private dependencies.
     * @return {void}
     */

  }, {
    key: "scanThirdParties",
    value: function scanThirdParties() {
      var thirdParty = this._options.thirdParty;

      if (!thirdParty) {
        return;
      }

      var includePrivate = thirdParty.includePrivate || false;

      var outputDependencies = _.chain(this._dependencies).values().filter(function (dependency) {
        return includePrivate || !dependency["private"];
      }).value();

      if (_.isFunction(thirdParty)) {
        return thirdParty(outputDependencies);
      }

      var allow = thirdParty.allow;

      if (allow) {
        this._scanLicenseViolations(outputDependencies, allow);
      }

      var output = thirdParty.output;

      if (output) {
        this._exportThirdParties(outputDependencies, output);
      }
    }
    /**
     * Log debug message if debug mode is enabled.
     *
     * @param {string} msg Log message.
     * @return {void}
     */

  }, {
    key: "debug",
    value: function debug(msg) {
      if (this._debug) {
        console.debug("[".concat(this.name, "] -- ").concat(msg));
      }
    }
    /**
     * Log warn message.
     *
     * @param {string} msg Log message.
     * @return {void}
     */

  }, {
    key: "warn",
    value: function warn(msg) {
      console.warn("[".concat(this.name, "] -- ").concat(msg));
    }
    /**
     * Read banner from given options and returns it.
     *
     * @param {Object|string} banner Banner as a raw string, or banner options.
     * @return {string|null} The banner template.
     * @private
     */

  }, {
    key: "_readBanner",
    value: function _readBanner(banner) {
      if (_.isNil(banner)) {
        return null;
      } // Banner can be defined as a simple inline string.


      if (_.isString(banner)) {
        this.debug('prepend banner from raw string');
        return banner;
      } // Extract banner content.


      var content = _.result(banner, 'content'); // Content can be an inline string.


      if (_.isString(content)) {
        this.debug('prepend banner from content raw string');
        return content;
      } // Otherwise, file must be defined (if not, that's an error).


      if (!_.has(content, 'file')) {
        throw new Error("[".concat(this.name, "] -- Cannot find banner content, please specify an inline content, or a path to a file"));
      }

      var file = content.file;
      var encoding = content.encoding || 'utf-8';
      this.debug("prepend banner from file: ".concat(file));
      this.debug("use encoding: ".concat(encoding));
      var filePath = path.resolve(file);
      var exists = fs.existsSync(filePath); // Fail fast if file does not exist.

      if (!exists) {
        throw new Error("[".concat(this.name, "] -- Template file ").concat(filePath, " does not exist, or cannot be read"));
      }

      return fs.readFileSync(filePath, encoding);
    }
    /**
     * Generate banner output from given raw string and given options.
     *
     * Banner output will be a JavaScript comment block, comment style may be customized using
     * the `commentStyle` option.
     *
     * @param {string} content Banner content, as a raw string.
     * @param {Object} banner Banner options.
     * @return {string} The banner output.
     * @private
     */

  }, {
    key: "_generateBanner",
    value: function _generateBanner(content, banner) {
      // Create the template function with lodash.
      var tmpl = _.template(content); // Generate the banner.


      var pkg = this._pkg;

      var dependencies = _.values(this._dependencies);

      var data = banner.data ? _.result(banner, 'data') : {};
      var text = tmpl({
        _: _,
        moment: moment,
        pkg: pkg,
        dependencies: dependencies,
        data: data
      }); // Compute comment style to use.

      var style = _.has(banner, 'commentStyle') ? banner.commentStyle : computeDefaultCommentStyle(text); // Ensure given style name is valid.

      if (!_.has(COMMENT_STYLES, style)) {
        throw new Error("Unknown comment style ".concat(style, ", please use one of: ").concat(_.keys(COMMENT_STYLES)));
      }

      this.debug("generate banner using comment style: ".concat(style));
      return COMMENT_STYLES[style] ? generateBlockComment(text, COMMENT_STYLES[style]) : text;
    }
    /**
     * Scan for dependency violations and print a warning if some violations are found.
     *
     * @param {Array<Object>} outputDependencies The dependencies to scan.
     * @param {string} allow The allowed licenses as a SPDX pattern.
     * @return {void}
     */

  }, {
    key: "_scanLicenseViolations",
    value: function _scanLicenseViolations(outputDependencies, allow) {
      var _this3 = this;

      _.forEach(outputDependencies, function (dependency) {
        _this3._scanLicenseViolation(dependency, allow);
      });
    }
    /**
     * Scan dependency for a dependency violation.
     *
     * @param {Object} dependency The dependency to scan.
     * @param {string|function|object} allow The allowed licenses as a SPDX pattern, or a validator function.
     * @return {void}
     */

  }, {
    key: "_scanLicenseViolation",
    value: function _scanLicenseViolation(dependency, allow) {
      var testFn = _.isString(allow) || _.isFunction(allow) ? allow : allow.test;
      var isValid = _.isFunction(testFn) ? testFn(dependency) : licenseValidator.isValid(dependency, testFn);

      if (!isValid) {
        var failOnUnlicensed = allow.failOnUnlicensed === true;
        var failOnViolation = allow.failOnViolation === true;

        this._handleInvalidLicense(dependency, failOnUnlicensed, failOnViolation);
      }
    }
    /**
     * Handle invalid dependency:
     * - Print a warning for unlicensed dependency.
     * - Print a warning for dependency violation.
     *
     * @param {Object} dependency The dependency to scan.
     * @param {boolean} failOnUnlicensed `true` to fail on unlicensed dependency, `false` otherwise.
     * @param {boolean} failOnViolation `true` to fail on license violation, `false` otherwise.
     * @return {void}
     */

  }, {
    key: "_handleInvalidLicense",
    value: function _handleInvalidLicense(dependency, failOnUnlicensed, failOnViolation) {
      if (licenseValidator.isUnlicensed(dependency)) {
        this._handleUnlicensedDependency(dependency, failOnUnlicensed);
      } else {
        this._handleLicenseViolation(dependency, failOnViolation);
      }
    }
    /**
     * Handle unlicensed dependency: print a warning to the console to alert for the dependency
     * that should be fixed.
     *
     * @param {Object} dependency The dependency.
     * @param {boolean} fail `true` to fail instead of emitting a simple warning.
     * @return {void}
     */

  }, {
    key: "_handleUnlicensedDependency",
    value: function _handleUnlicensedDependency(dependency, fail) {
      var message = "Dependency \"".concat(dependency.name, "\" does not specify any license.");

      if (!fail) {
        this.warn(message);
      } else {
        throw new Error(message);
      }
    }
    /**
     * Handle license violation: print a warning to the console to alert about the violation.
     *
     * @param {Object} dependency The dependency.
     * @param {boolean} fail `true` to fail instead of emitting a simple warning.
     * @return {void}
     */

  }, {
    key: "_handleLicenseViolation",
    value: function _handleLicenseViolation(dependency, fail) {
      var message = "Dependency \"".concat(dependency.name, "\" has a license (").concat(dependency.license, ") which is not compatible with ") + "requirement, looks like a license violation to fix.";

      if (!fail) {
        this.warn(message);
      } else {
        throw new Error(message);
      }
    }
    /**
     * Export scanned third party dependencies to a destination output (a function, a
     * file written to disk, etc.).
     *
     * @param {Array<Object>} outputDependencies The dependencies to include in the output.
     * @param {Object|function|string|Array} outputs The output (or the array of output) destination.
     * @return {void}
     */

  }, {
    key: "_exportThirdParties",
    value: function _exportThirdParties(outputDependencies, outputs) {
      var _this4 = this;

      _.forEach(_.castArray(outputs), function (output) {
        _this4._exportThirdPartiesToOutput(outputDependencies, output);
      });
    }
    /**
     * Export scanned third party dependencies to a destination output (a function, a
     * file written to disk, etc.).
     *
     * @param {Array<Object>} outputDependencies The dependencies to include in the output.
     * @param {Array} output The output destination.
     * @return {void}
     */

  }, {
    key: "_exportThirdPartiesToOutput",
    value: function _exportThirdPartiesToOutput(outputDependencies, output) {
      if (_.isFunction(output)) {
        return output(outputDependencies);
      } // Default is to export to given file.
      // Allow custom formatting of output using given template option.


      var template = _.isString(output.template) ? function (dependencies) {
        return _.template(output.template)({
          dependencies: dependencies,
          _: _,
          moment: moment
        });
      } : output.template;

      var defaultTemplate = function defaultTemplate(dependencies) {
        return _.isEmpty(dependencies) ? 'No third parties dependencies' : _.map(dependencies, function (d) {
          return d.text();
        }).join("".concat(EOL).concat(EOL, "---").concat(EOL).concat(EOL));
      };

      var text = _.isFunction(template) ? template(outputDependencies) : defaultTemplate(outputDependencies);

      var isOutputFile = _.isString(output);

      var file = isOutputFile ? output : output.file;
      var encoding = isOutputFile ? 'utf-8' : output.encoding || 'utf-8';
      this.debug("exporting third-party summary to ".concat(file));
      this.debug("use encoding: ".concat(encoding)); // Create directory if it does not already exist.

      mkdirp.sync(path.parse(file).dir);
      fs.writeFileSync(file, (text || '').trim(), {
        encoding: encoding
      });
    }
  }]);

  return LicensePlugin;
}();
/**
 * Create new `rollup-plugin-license` instance with given
 * options.
 *
 * @param {Object} options Option object.
 * @return {LicensePlugin} The new instance.
 */


module.exports = function licensePlugin(options) {
  return new LicensePlugin(licensePluginOptions(options));
};