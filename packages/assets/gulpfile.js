const gulp = require('gulp');
const fs = require('fs-extra');

const taskPaths = require('./gulpTasks/taskPaths');
const mergeProfiles = require('./gulpTasks/mergeProfilesTask');
const copySchemas = require('./gulpTasks/copySchemasTask');
const copyTools = require('./gulpTasks/copyToolsTask');
const writeProfilesList = require('./gulpTasks/writeProfilesListTask');

function clean() {
  return fs.remove(taskPaths.dest);
}

function copyAssets() {
  return gulp.src(taskPaths.assetsGlob).pipe(gulp.dest(taskPaths.assetsDest));
}

const build = gulp.series(
  copySchemas,
  mergeProfiles,
  gulp.parallel(copyAssets, copyTools, writeProfilesList)
);

const cleanBuild = gulp.series(clean, build);

function watchBuild() {
  return gulp.watch(taskPaths.watchGlobs, { ignoreInitial: false }, cleanBuild);
}

exports.clean = clean;
exports.build = build;
exports.cleanBuild = cleanBuild;
exports.watch = watchBuild;

exports.default = cleanBuild;
