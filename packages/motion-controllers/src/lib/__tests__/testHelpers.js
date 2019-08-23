const path = require('path');
const fs = require('fs-extra');

const profilesListPath = require.resolve('@webxr-input-profiles/profiles-registry');

const profilesFolderPath = path.dirname(profilesListPath);

const TestHelpers = {
  profilesFolderPath,

  /**
   * @description Builds and retrieves the list of supported profiles
   */
  getSupportedProfilesList() {
    const profilesList = fs.readJSONSync(profilesListPath);
    return profilesList;
  },

  /**
   * @description Loads a profile description
   * @param {string} profileName - The name of the profile to load
   */
  getProfile(profileName) {
    const profilePath = path.join(profilesFolderPath, profileName, 'profile.json');
    const profile = fs.readJSONSync(profilePath);
    return profile;
  },

  /**
   * @description Makes a deep copy of JSON-compatible objects
   * @param {Object} objectToCopy - The object to copy
   * @returns {Object} A copy of the object
   */
  copyJsonObject(objectToCopy) {
    return JSON.parse(JSON.stringify(objectToCopy));
  }

};

module.exports = TestHelpers;
