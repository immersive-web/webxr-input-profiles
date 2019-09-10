const path = require('path');
const fs = require('fs-extra');
const glob = require('glob');

const taskPaths = require('./taskPaths');

const profilesListDest = path.join(taskPaths.profilesDest, 'profilesList.json');

function generate() {
  return new Promise((resolve, reject) => {
    const profilesList = {};
    glob(taskPaths.profilesGlob, null, (error, files) => {
      if (error) {
        reject(error);
      } else {
        files.forEach((file) => {
          const profileId = path.basename(path.dirname(file));
          const relativePath = file.substr((taskPaths.profilesSrc.length) + 1);
          profilesList[profileId] = relativePath;
        });

        resolve(profilesList);
      }
    });
  });
}

function writeProfilesList() {
  return generate().then((profilesList) => {
    fs.outputJson(profilesListDest, profilesList, { spaces: 2 });
  });
}

module.exports = writeProfilesList;
