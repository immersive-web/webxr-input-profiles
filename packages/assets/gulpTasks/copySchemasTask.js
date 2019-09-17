const gulp = require('gulp');
const path = require('path');
const jsonCombine = require('gulp-jsoncombine');
const through = require('through2');
const optionalRequire = require('optional-require')(require);

const registryModulePath = optionalRequire.resolve('@webxr-input-profiles/registry', '');

const taskPaths = require('./taskPaths');

const mainSchemaFilename = 'profile.schema.json';

function replaceCommonSchemaId(commonSchemaFilename) {
  let mainSchemaId;
  return through.obj((vinylFile, encoding, callback) => {
    if (vinylFile.relative === mainSchemaFilename) {
      const mainSchema = JSON.parse(vinylFile.contents.toString());
      mainSchemaId = mainSchema.$id;
      callback(null, vinylFile);
    } else if (vinylFile.relative === commonSchemaFilename) {
      const commonSchemaId = mainSchemaId.replace(mainSchemaFilename, commonSchemaFilename);
      const commonSchema = JSON.parse(vinylFile.contents.toString());
      commonSchema.$id = commonSchemaId;

      const clonedFile = vinylFile.clone();
      clonedFile.contents = Buffer.from(JSON.stringify(commonSchema, null, 2));
      callback(null, clonedFile);
    } else {
      callback(null, vinylFile);
    }
  });
}

function combineSchemas(input) {
  const mainSchemaKey = path.basename(mainSchemaFilename, '.json');
  const mainSchema = input[mainSchemaKey];
  const dependencies = [];
  Object.keys(input).forEach((key) => {
    if (key !== mainSchemaKey) {
      dependencies.push(input[key]);
    }
  });

  const schemas = {
    mainSchema,
    dependencies
  };
  return Buffer.from(JSON.stringify(schemas, null, 2));
}

function copySchemas() {
  const commonSchemaFilename = 'common.schema.json';
  const commonSchemaPath = path.join(
    path.dirname(registryModulePath),
    'schemas',
    commonSchemaFilename
  );

  const srcGlob = [taskPaths.schemasGlob, commonSchemaPath];
  return gulp.src(srcGlob)
    .pipe(replaceCommonSchemaId(commonSchemaFilename))
    .pipe(gulp.dest(taskPaths.schemasDest))
    .pipe(jsonCombine(taskPaths.schemasCombinedFilename, combineSchemas))
    .pipe(gulp.dest(taskPaths.toolsDest));
}

module.exports = copySchemas;
