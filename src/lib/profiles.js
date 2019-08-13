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
    let profileBaseUri;
    profilesToMatch.some((profileName) => {
      if (supportedProfilesList.includes(profileName)) {
        profileBaseUri = `${this.baseUri}/${profileName}`;
      }
      return !!profileBaseUri;
    });

    if (!profileBaseUri) {
      throw new Error('No matching profile name found');
    }

    const profile = await Profiles.fetchJsonFile(`${profileBaseUri}/profile.json`);

    return profile;
  }

  getAssetUrl(profile, handedness) {
    if (!profile || !profile.handedness || !profile.id) {
      throw new Error('Malformed profile');
    }

    const hand = profile.handedness[handedness];
    if (!hand) {
      throw new Error(`Handedness ${handedness} not present in the profile`);
    }

    const assetName = hand.asset;
    if (!assetName) {
      throw new Error(`Handedness ${handedness} does not have an asset defined`);
    }

    const profileBaseUrl = `${this.baseUri}/${profile.id}`;
    const assetUrl = `${profileBaseUrl}/${assetName}`;
    return assetUrl;
  }
}
export default Profiles;
