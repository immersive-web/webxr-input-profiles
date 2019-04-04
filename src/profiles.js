import MotionController from './motionController';

class Profiles {
  constructor(baseUri) {
    this.baseUri = baseUri;
  }

  static async fetchJsonFile(uri) {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(response.statusText);
    } else {
      return response.json();
    }
  }

  async fetchSupportedProfilesList() {
    if (!this.profilesList) {
      if (!this.profilesListPromise) {
        this.profilesListPromise = Profiles.fetchJsonFile(`${this.baseUri}/list.json`);
      }

      try {
        this.profilesList = await this.profilesListPromise;
      } catch (error) {
        this.profilesListPromise = null;
        throw error;
      }
    }

    return this.profilesList;
  }

  async fetchProfile(profilesToMatch) {
    if (!profilesToMatch) {
      throw new Error('No profilesToMatch supplied');
    }

    const supportedProfilesList = await this.fetchSupportedProfilesList();

    let relativePath;
    profilesToMatch.some((profileName) => {
      if (supportedProfilesList.includes(profileName)) {
        relativePath = profileName;
      }
      return !!relativePath;
    });

    if (!relativePath) {
      throw new Error('No matching profile name found');
    }

    const profileFolder = `${this.baseUri}/${relativePath}`;
    const profile = await Profiles.fetchJsonFile(`${profileFolder}/profile.json`);
    profile.baseUri = profileFolder;
    return profile;
  }

  async createMotionController(xrInputSource) {
    const profile = await this.fetchProfile(xrInputSource.getProfiles());
    const motionController = new MotionController(xrInputSource, profile);
    return motionController;
  }
}

export default Profiles;
