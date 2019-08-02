/* eslint import/no-unresolved: off */

import { Profiles } from '../../../dist/webxr-input-profiles.module.js';
import { MockGamepad, MockXRInputSource } from '../../../dist/webxr-input-mocks.module.js';
import ModelViewer from './modelViewer.js';
import ManualControls from './buildElements.js';

const profiles = new Profiles('../../../dist/profiles');
let supportedProfilesList;
let profileSelectorElement;
let handednessSelectorElement;

let activeProfile;

function changeActiveHandedness() {
  // Disable user interaction during change
  profileSelectorElement.disabled = true;
  handednessSelectorElement.disabled = true;

  // Clear the old info
  ModelViewer.clear();
  ManualControls.clear();

  // Create a mockgamepad that matches the profile and handedness
  const handedness = handednessSelectorElement.value;
  const mockGamepad = new MockGamepad(activeProfile, handedness);
  const mockXRInputSource = new MockXRInputSource(mockGamepad, handedness);
  profiles.createMotionController(mockXRInputSource).then((motionController) => {
    ManualControls.build(motionController);
    ModelViewer.loadModel(motionController);
  }).finally(() => {
    profileSelectorElement.disabled = false;
    handednessSelectorElement.disabled = false;
  });
}

function changeActiveProfile() {
  // Disable user interaction during change
  profileSelectorElement.disabled = true;
  handednessSelectorElement.disabled = true;

  // Clear the old info
  activeProfile = undefined;
  ModelViewer.clear();
  ManualControls.clear();
  handednessSelectorElement.innerHTML = `
    <option value='loading'>Loading...</option>
  `;

  // Load the new profile
  profiles.fetchProfile([profileSelectorElement.value]).then((profile) => {
    activeProfile = profile;

    // Populate handedness selector
    handednessSelectorElement.innerHTML = '';
    Object.keys(activeProfile.handedness).forEach((handedness) => {
      handednessSelectorElement.innerHTML += `
        <option value='${handedness}'>${handedness}</option>
      `;
    });

    // Manually trigger the handedness to change
    changeActiveHandedness();
  }).catch((error) => {
    profileSelectorElement.disabled = false;
    handednessSelectorElement.disabled = true;
    throw error;
  });
}

function populateProfileSelector() {
  // Disable user interaction during load
  profileSelectorElement.disabled = true;
  handednessSelectorElement.disabled = true;

  profiles.fetchSupportedProfilesList().then((profilesList) => {
    supportedProfilesList = profilesList;

    // Remove loading entry
    profileSelectorElement.innerHTML = '';

    if (supportedProfilesList.length === 0) {
      // No supported profiles found
      profileSelectorElement.innerHTML = `
        <option value='No profiles found'>No profiles found</option>
      `;
    } else {
      // Populate the selector with the profiles list
      supportedProfilesList.forEach((supportedProfile) => {
        profileSelectorElement.innerHTML += `
        <option value='${supportedProfile}'>${supportedProfile}</option>
        `;
      });

      // Manually trigger active profile to change
      changeActiveProfile();
    }
  });
}

function onLoad() {
  ModelViewer.initialize();

  profileSelectorElement = document.getElementById('profileSelector');
  handednessSelectorElement = document.getElementById('handednessSelector');
  profileSelectorElement.addEventListener('change', changeActiveProfile);
  handednessSelectorElement.addEventListener('change', changeActiveHandedness);
  populateProfileSelector();
}
window.addEventListener('load', onLoad);
