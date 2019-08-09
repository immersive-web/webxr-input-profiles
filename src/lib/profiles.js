import MotionController from './motionController';

class Profiles {
  /**
   * @description Initializes the class to point to the URI with the profiles and assets
   * @param {string} baseUri - The URI to the folder in which the resources sit
   */
  constructor(baseUri) {
    this.baseUri = baseUri;
  }

  /**
   * @description Static helper function to fetch a JSON file and turn it into a JS object
   * @param {string} uri - File URI to fetch
   */
  static async fetchJsonFile(uri) {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(response.statusText);
    } else {
      return response.json();
    }
  }

  /**
   * @description Returns the list of available profiles in the target folder. Fetches the remote
   * list if not already downloaded.
   */
  async fetchSupportedProfilesList() {
    // If the profile list hasn't already been retrieved, attempt to fetch it
    if (!this.profilesList) {
      // If there is no attempt currently in progress, start one
      if (!this.profilesListPromise) {
        this.profilesListPromise = Profiles.fetchJsonFile(`${this.baseUri}/profilesList.json`);
      }

      try {
        // Wait on the results of the fetch
        this.profilesList = await this.profilesListPromise;
      } catch (error) {
        // If the fetch has failed, clear out the promise so another attempt can be made later
        this.profilesListPromise = null;
        throw error;
      }
    }

    return this.profilesList;
  }

  /**
   * @description Fetches the first recognized profile description
   * @param {string[]} profilesToMatch - The list of profiles to attempt to match as reported
   * by the XRInputSource
   */
  async fetchProfile(profilesToMatch) {
    if (!profilesToMatch) {
      throw new Error('No profilesToMatch supplied');
    }

    // Get the list of profiles
    const supportedProfilesList = await this.fetchSupportedProfilesList();

    // Find the relative path to the first requested profile that is recognized
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

    // Fetch the profile description
    const profileFolder = `${this.baseUri}/${relativePath}`;
    const profile = await Profiles.fetchJsonFile(`${profileFolder}/profile.json`);

    // Add the folder URI to the profile description so the asset can be retrieved
    profile.baseUri = profileFolder;

    return profile;
  }

  /**
   * @description Create a MotionController from an XRInputSource by first fetching the best
   * available profile match
   * @param {Object} xrInputSource - The input source to build a MotionController from
   */
  async createMotionController(xrInputSource) {
    const profile = await this.fetchProfile(xrInputSource.getProfiles());
    const motionController = new MotionController(xrInputSource, profile);
    return motionController;
  }

  /**
   * @description Create a MotionController from an XRInputSource
   * @param {Object} xrInputSource - The input source to build a MotionController from
   * @param {Object} profile - The custom profile to use
   */
  static createCustomMotionController(xrInputSource, profile) {
    const motionController = new MotionController(xrInputSource, profile);
    return motionController;
  }
}

export default Profiles;
