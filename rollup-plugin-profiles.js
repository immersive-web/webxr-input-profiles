const fs = require('fs-extra');
const path = require('path');
const chokidar = require('chokidar');
const globby = require('globby');

function isDirectory(targetPath) {
  return fs.lstatSync(targetPath).isDirectory();
}

export default function generateProfilesList({ profilePaths, dest, watch } = {}) {
  if (!dest || (fs.pathExistsSync(dest) && isDirectory(dest))) {
    throw new Error(`Invalid dest supplied: ${dest}`);
  }

  const profilesList = {};

  function writeProfilesList() {
    const fileText = JSON.stringify(Object.values(profilesList), null, 2);
    fs.writeFileSync(dest, fileText);
  }

  function addFileToList(filePath) {
    if (filePath.endsWith('.json')) {
      profilesList[filePath] = path.basename(path.dirname(filePath));
      writeProfilesList();
    }
  }

  function removeFileFromList(filePath) {
    if (filePath.endsWith('.json')) {
      delete profilesList[filePath];
      writeProfilesList();
    }
  }

  return {
    name: 'buildProfilesList',
    buildStart: async () => {
      // Get the profilesList
      const filePaths = await globby(`${profilePaths}/*.json`);
      filePaths.forEach((filePath) => {
        profilesList[filePath] = path.basename(path.dirname(filePath));
      });

      if (watch) {
        profilePaths.forEach((profilePath) => {
          chokidar.watch(profilePath)
            .on('add', filePath => addFileToList(filePath))
            .on('unlink', filePath => removeFileFromList(filePath))
            .on('error', error => console.error(error)); // eslint-disable-line no-console
        });
      } else {
        writeProfilesList();
      }
    }
  };
}
