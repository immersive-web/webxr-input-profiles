/* eslint-disable import/no-unresolved */
import { fetchProfile, fetchProfilesList, MotionController } from './motion-controllers.module.js';
/* eslint-enable */

import MockGamepad from './mocks/mockGamepad.js';
import MockXRInputSource from './mocks/mockXRInputSource.js';

import ErrorLogging from './errorLogging.js';
import HandednessSelector from './handednessSelector.js';

const profileIdStorageKey = 'repository_profileId';
const profilesBasePath = './profiles';
/**
 * Loads profiles from the distribution folder next to the viewer's location
 */
class RepositorySelector {
  constructor() {
    this.element = document.getElementById('repository');

    // Get the profile id dropdown and listen for changes
    this.profileIdSelectorElement = document.getElementById('repositoryProfileIdSelector');
    this.profileIdSelectorElement.addEventListener('change', () => { this.onProfileIdSelected(); });

    // Add a handedness selector and listen for changes
    this.handednessSelector = new HandednessSelector('repository');
    this.element.appendChild(this.handednessSelector.element);
    this.handednessSelector.element.addEventListener('handednessChange', (event) => { this.onHandednessChange(event); });

    this.disabled = true;
    this.clearSelectedProfile();
  }

  enable() {
    this.element.hidden = false;
    this.disabled = false;
    this.populateProfileSelector();
  }

  disable() {
    this.element.hidden = true;
    this.disabled = true;
    this.clearSelectedProfile();
  }

  clearSelectedProfile() {
    ErrorLogging.clearAll();
    this.selectedProfile = null;
    this.profileIdSelectorElement.disabled = true;
    this.handednessSelector.clearSelectedProfile();
  }

  /**
   * Responds to changes in selected handedness.
   * Creates a new motion controller for the combination of profile and handedness, and fires an
   * event to signal the change
   * @param {object} event
   */
  onHandednessChange(event) {
    if (!this.disabled) {
      let motionController;
      const handedness = event.detail;

      // Create motion controller if a handedness has been selected
      if (handedness) {
        const mockGamepad = new MockGamepad(this.selectedProfile, handedness);
        const mockXRInputSource = new MockXRInputSource(mockGamepad, handedness);

        fetchProfile(mockXRInputSource, profilesBasePath).then(({ profile, assetPath }) => {
          motionController = new MotionController(
            mockXRInputSource,
            profile,
            assetPath
          );

          // Signal the change
          const changeEvent = new CustomEvent(
            'motionControllerChange',
            { detail: motionController }
          );
          this.element.dispatchEvent(changeEvent);
        });
      } else {
        // Signal the change
        const changeEvent = new CustomEvent('motionControllerChange', { detail: null });
        this.element.dispatchEvent(changeEvent);
      }
    }
  }

  /**
   * Handler for the profile id selection change
   */
  onProfileIdSelected() {
    this.clearSelectedProfile();

    const profileId = this.profileIdSelectorElement.value;
    window.localStorage.setItem(profileIdStorageKey, profileId);

    // Attempt to load the profile
    fetchProfile({ profiles: [profileId] }, profilesBasePath, false).then(({ profile }) => {
      this.selectedProfile = profile;
      this.handednessSelector.setSelectedProfile(this.selectedProfile);
    })
      .catch((error) => {
        ErrorLogging.log(error.message);
        throw error;
      })
      .finally(() => {
        this.profileIdSelectorElement.disabled = false;
      });
  }

  /**
   * Retrieves the full list of available profiles
   */
  populateProfileSelector() {
    this.clearSelectedProfile();

    // Load and clear local storage
    const storedProfileId = window.localStorage.getItem(profileIdStorageKey);
    window.localStorage.removeItem(profileIdStorageKey);

    // Load the list of profiles
    this.profileIdSelectorElement.innerHTML = '<option value="loading">Loading...</option>';
    fetchProfilesList(profilesBasePath).then((profilesList) => {
      this.profileIdSelectorElement.innerHTML = '';
      Object.keys(profilesList).forEach((profileId) => {
        this.profileIdSelectorElement.innerHTML += `
        <option value='${profileId}'>${profileId}</option>
        `;
      });

      // Override the default selection if values were present in local storage
      if (storedProfileId) {
        this.profileIdSelectorElement.value = storedProfileId;
      }

      // Manually trigger selected profile to load
      this.onProfileIdSelected();
    })
      .catch((error) => {
        ErrorLogging.log(error.message);
        throw error;
      });
  }
}

export default RepositorySelector;
