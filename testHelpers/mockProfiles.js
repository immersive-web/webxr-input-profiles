const fs = require('fs-extra');
const { join } = require('path');

function isDirectorySync(path) {
  return fs.lstatSync(path).isDirectory();
}

function getDirectoriesSync(folder) {
  const folderContents = fs.readdirSync(folder);
  const directories = folderContents.filter(item => isDirectorySync(join(folder, item)));
  return directories;
}

class Profiles {
  constructor(basePath) {
    this.basePath = basePath;
  }

  getProfilesList() {
    if (!this.profilesList) {
      this.profilesList = {};
      const profileTypes = getDirectoriesSync(this.basePath);
      profileTypes.forEach((profileType) => {
        const profileTypeList = {};
        const profileNames = getDirectoriesSync(join(this.basePath, profileType));
        profileNames.forEach((profileName) => {
          const profilePath = join(this.basePath, profileType, profileName, 'profile.json');
          profileTypeList[profileName] = profilePath;
        });
        this.profilesList[profileType] = profileTypeList;
      });
    }

    return this.profilesList;
  }

  getProfilePath(profileName, profileType) {
    const profilesList = this.getProfilesList(profileType);
    if (profilesList[profileType][profileName]) {
      return profilesList[profileType][profileName];
    }

    throw new Error(`Matching profile not found for ${profileName} in ${profileType}`);
  }

  getProfile(profileName, profileType) {
    const profilePath = this.getProfilePath(profileName, profileType);
    return JSON.parse(fs.readFileSync(profilePath));
  }
}

module.exports = Profiles;
