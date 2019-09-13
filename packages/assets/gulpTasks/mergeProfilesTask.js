const gulp = require('gulp');
const path = require('path');
const fs = require('fs-extra');
const Ajv = require('ajv');
const through = require('through2');

const optionalRequire = require('optional-require')(require);

const registryModulePath = optionalRequire.resolve('@webxr-input-profiles/registry', '');

const taskPaths = require('./taskPaths');
const mergeProfile = require('../src/mergeProfile');

/**
 * Validate the profile against the schema
 * @param {object} profileJson - the profile to validate
 */
function buildValidator() {
  const ajv = new Ajv();
  const schemasPath = path.join(taskPaths.toolsDest, 'schemas.json');
  const schemas = fs.readJsonSync(schemasPath);
  schemas.dependencies.forEach((schema) => {
    ajv.addSchema(schema);
  });
  return ajv.compile(schemas.mainSchema);
}

function validate(schemaValidator) {
  return through.obj((vinylFile, encoding, callback) => {
    const profileJson = JSON.parse(vinylFile.contents.toString());

    // Validate the supplied profile
    if (!schemaValidator(profileJson)) {
      const errors = JSON.stringify(schemaValidator.errors, null, 2);
      throw new Error(`${profileJson.id} Failed to validate schema with errors: ${errors}`);
    }

    callback(null, vinylFile);
  });
}

function merge() {
  return through.obj((vinylFile, encoding, callback) => {
    const assetJson = JSON.parse(vinylFile.contents.toString());

    // Get the matching file from the registry
    const registryFolder = path.join(path.dirname(registryModulePath), 'profiles');
    const registryJson = fs.readJsonSync(path.join(registryFolder, vinylFile.relative));

    const mergedJson = mergeProfile(registryJson, assetJson);
    const mergedFile = vinylFile.clone();
    mergedFile.contents = Buffer.from(JSON.stringify(mergedJson, null, 2));

    callback(null, mergedFile);
  });
}

function mergeProfiles() {
  const schemaValidator = buildValidator();

  return gulp.src(taskPaths.profilesGlob)
    .pipe(validate(schemaValidator))
    .pipe(merge())
    .pipe(gulp.dest(taskPaths.profilesDest));
}

module.exports = mergeProfiles;
