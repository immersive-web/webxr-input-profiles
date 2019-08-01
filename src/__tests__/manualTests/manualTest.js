/* eslint import/no-unresolved: off */

import { Constants, Profiles } from '../../../dist/webxr-input-profiles.module.js';
import { MockGamepad, MockXRInputSource } from '../../../dist/webxr-input-mocks.module.js';
import ModelViewer from './modelViewer.js';
import buildElements from './buildElements.js';

const profiles = new Profiles('../../../dist/profiles');
let mockXRInputSource;
let supportedProfilesList;
let profile;
let motionController;

function populateProfileSelector() {
  profiles.fetchSupportedProfilesList().then((profilesList) => {
    supportedProfilesList = profilesList;

    // Remove loading entry
    const profileSelectorElement = document.getElementById('profileSelector');
    profileSelectorElement.innerHTML = '';

    if (supportedProfilesList.length == 0) {
      // No supported profiles found
      profileSelectorElement.innerHTML = `
        <option value='No profiles found'>No profiles found</option>
      `;
    } else {
      // Populate the selector with the profiles list
      supportedProfilesList.forEach((supportedProfile) => {
        profileSelectorElement.innerHTML += `
        <option value=${supportedProfile}>${supportedProfile}</option>
        `;
      });

      // Hook up event listener and load profile
      profileSelectorElement.addEventListener('change', onSelectorChange);
      fetchProfile(profileSelectorElement.value);
    }
  });
}

function onSelectorChange() {
  const profileSelectorElement = document.getElementById('profileSelector');
  fetchProfile(profileSelectorElement.value);
}

function fetchProfile() {
  profiles.fetchProfile(['fake profile id', gamepadId]).then((fetchedProfile) => {
    profile = fetchedProfile;
    const mockGamepad = new MockGamepad(profile);
    mockXRInputSource = new MockXRInputSource(mockGamepad, Constants.Handedness.LEFT);
    profiles.createMotionController(mockXRInputSource).then((createdMotionController) => {
      motionController = createdMotionController;
      ModelViewer.loadAsset(motionController).then(() => {
        buildElements(motionController);
      });
    });
  });
}

function onLoad() {
  const motionControllerElement = document.getElementById('motionController');
  ModelViewer.initialize(motionControllerElement);
  populateDropdown(populateProfileSelector);
}
window.addEventListener('load', onLoad);
