const {
  watch, src, dest, series
} = require('gulp');
const fs = require('fs-extra');
const glob = require('glob');
const path = require('path');

const profileJsonGlob = 'profiles/*/profile.json';
const srcGlob = 'profiles/**';
const destFolder = 'dist/';

function clean() {
  return fs.remove(destFolder);
}

function writeProfilesList() {
  const profilesList = {};
  return glob(profileJsonGlob, null, (error, files) => {
    files.forEach((filePath) => {
      profilesList[filePath] = path.basename(path.dirname(filePath));
    });

    const fileText = JSON.stringify(Object.values(profilesList), null, 2);
    fs.writeFileSync(path.join(destFolder, 'profilesList.json'), fileText);
  });
}

function copyProfiles() {
  return src(srcGlob).pipe(dest(destFolder));
}

const build = series(clean, copyProfiles, writeProfilesList);

function watchBuild() {
  watch(srcGlob, build);
}

exports.clean = clean;
exports.build = build;
exports.watch = watchBuild;

exports.default = build;
