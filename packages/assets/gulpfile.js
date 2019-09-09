const gulp = require('gulp');
const fs = require('fs-extra');
const glob = require('glob');
const path = require('path');
const through = require('through2');
const profileValidator = require('./src/profileValidator');
const profileMerger = require('./src/mergeProfile');

const schemasGlob = 'schemas/*.schema.json';
const profilesGlob = 'profiles/**/*.json';
const assetsGlob = ['profiles/**', `!${profilesGlob}`];
const watchPaths = ['profiles/**', 'schemas/**'];

const destFolder = 'dist/';
const profilesAndAssetsDestFolder = path.join(destFolder, 'profiles');
const schemasDestFolder = path.join(destFolder, 'schemas');

let profilesList = {};

function buildProfilesList() {
  return glob(profilesGlob, null, (error, files) => {
    profilesList = {};
    files.forEach((file) => {
      const profileId = path.basename(file, '.json');
      const relativePath = file.substr(('profiles/'.length));
      profilesList[profileId] = relativePath;
    });
  });
}

function writeProfilesList() {
  const profilesListPath = path.join(profilesAndAssetsDestFolder, 'profilesList.json');
  return fs.outputJson(profilesListPath, profilesList, { spaces: 2 });
}

function validate() {
  return through.obj((vinylFile, encoding, callback) => {
    const profileJson = JSON.parse(vinylFile.contents.toString());
    profileValidator(profileJson);
    callback(null, vinylFile);
  });
}

function merge() {
  return through.obj((vinylFile, encoding, callback) => {
    const profileJson = JSON.parse(vinylFile.contents.toString());
    const mergedJson = profileMerger(vinylFile.relative, profileJson);
    const mergedFile = vinylFile.clone();
    mergedFile.contents = Buffer.from(JSON.stringify(mergedJson, null, 2));
    callback(null, mergedFile);
  });
}

function copyProfiles() {
  return gulp.src(profilesGlob)
    .pipe(validate())
    .pipe(merge())
    .pipe(gulp.dest(profilesAndAssetsDestFolder));
}

function copyAssets() {
  return gulp.src(assetsGlob).pipe(gulp.dest(profilesAndAssetsDestFolder));
}

function copySchemas() {
  return gulp.src(schemasGlob).pipe(gulp.dest(schemasDestFolder));
}

const build = gulp.series(
  buildProfilesList,
  gulp.parallel(copyProfiles, copyAssets, copySchemas, writeProfilesList)
);

function clean() {
  return fs.remove(destFolder);
}

const cleanBuild = gulp.series(clean, build);

function watchBuild() {
  return gulp.watch(watchPaths, { ignoreInitial: false }, cleanBuild);
}

exports.clean = clean;
exports.build = build;
exports.cleanBuild = cleanBuild;
exports.watch = watchBuild;

exports.default = cleanBuild;
