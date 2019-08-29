const gulp = require('gulp');
const fs = require('fs-extra');
const glob = require('glob');
const path = require('path');
const through = require('through2');

const profileValidator = require('./src/profileValidator');

const schemasGlob = 'schemas/*.schema.json';
const profilesGlob = 'profiles/**/*.json';
const globPath = ['profiles/**', 'schemas/**'];

const destFolder = 'dist/';
const schemasDestFolder = path.join(destFolder, 'schemas');
const profilesDestFolder = path.join(destFolder, 'profiles');

let profilesList = {};

function buildProfilesList() {
  return glob(profilesGlob, null, (error, files) => {
    profilesList = {};
    files.forEach((file) => {
      const profileId = path.basename(file, '.json');
      profilesList[profileId] = file;
    });
  });
}

function writeProfilesList() {
  const profilesListPath = path.join(destFolder, 'profilesList.json');
  return fs.outputJson(profilesListPath, profilesList, { spaces: 2 });
}

function copyProfiles() {
  const validate = () => through.obj((vinylFile, encoding, callback) => {
    const profileJson = JSON.parse(vinylFile.contents.toString());
    profileValidator(profileJson, profilesList);
    callback(null, vinylFile);
  });

  return gulp.src(profilesGlob)
    .pipe(validate())
    .pipe(gulp.dest(profilesDestFolder));
}

function copySchemas() {
  return gulp.src(schemasGlob).pipe(gulp.dest(schemasDestFolder));
}

function clean() {
  return fs.remove(destFolder);
}

const build = gulp.series(
  buildProfilesList,
  gulp.parallel(copyProfiles, copySchemas, writeProfilesList)
);

const cleanBuild = gulp.series(clean, build);

function watchBuild() {
  return gulp.watch(globPath, { ignoreInitial: false }, cleanBuild);
}

exports.clean = clean;
exports.build = build;
exports.cleanBuild = cleanBuild;
exports.watch = watchBuild;

exports.default = build;
