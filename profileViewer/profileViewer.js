/* eslint import/no-unresolved: off */

import { Profiles } from '../dist/webxr-input-profiles.module.js';
import { MockGamepad, MockXRInputSource } from '../dist/webxr-input-mocks.module.js';
import ModelViewer from './modelViewer.js';
import ManualControls from './buildElements.js';
import ErrorLogging from './errorLogging.js';

const profiles = new Profiles('../dist/profiles');

const urlSearchParams = new URL(window.location).searchParams;

let supportedProfilesList;
let profileSelectorElement;
let handednessSelectorElement;
let fileNamesElement;
let fileNamesSelectorElement;

let activeProfile;
let customProfileAssets = {};

function clear(saveProfile) {
  ErrorLogging.clearAll();
  ModelViewer.clear();
  ManualControls.clear();
  if (!saveProfile) {
    activeProfile = undefined;
    customProfileAssets = {};
  }
}

function ensureInteractionDisabled() {
  profileSelectorElement.disabled = true;
  handednessSelectorElement.disabled = true;
  fileNamesSelectorElement.disabled = true;
}

function enableInteraction() {
  profileSelectorElement.disabled = false;
  handednessSelectorElement.disabled = false;
  fileNamesSelectorElement.disabled = (profileSelectorElement.value !== 'custom');
}

function setUrl(profileId, handedness) {
  if (profileId) {
    urlSearchParams.set('profileId', profileId);
  } else {
    urlSearchParams.delete('profileId');
  }

  if (handedness) {
    urlSearchParams.set('handedness', handedness);
  } else {
    urlSearchParams.delete('handedness');
  }

  window.history.replaceState(null, null, `${window.location.pathname}?${urlSearchParams.toString()}`);
}

function onHandednessSelected() {
  ensureInteractionDisabled();
  setUrl(profileSelectorElement.value, handednessSelectorElement.value);
  clear(/* saveProfile */ true);

  // Create a mock gamepad that matches the profile and handedness
  const handedness = handednessSelectorElement.value;
  const mockGamepad = new MockGamepad(activeProfile, handedness);
  const mockXRInputSource = new MockXRInputSource(mockGamepad, handedness);
  if (profileSelectorElement.value === 'custom') {
    const motionController = Profiles.createCustomMotionController(
      mockXRInputSource, activeProfile
    );
    ManualControls.build(motionController);
    ModelViewer.loadModel(motionController, customProfileAssets[motionController.assetPath]);
    enableInteraction();
  } else {
    profiles.createMotionController(mockXRInputSource).then((motionController) => {
      ManualControls.build(motionController);
      ModelViewer.loadModel(motionController);
    }).finally(() => {
      enableInteraction();
    });
  }
}

function onProfileLoaded(profile, queryStringHandedness) {
  ensureInteractionDisabled();

  activeProfile = profile;

  // Populate handedness selector
  handednessSelectorElement.innerHTML = '';
  Object.keys(activeProfile.handedness).forEach((handedness) => {
    handednessSelectorElement.innerHTML += `
      <option value='${handedness}'>${handedness}</option>
    `;
  });

  // Apply handedness if supplied
  if (queryStringHandedness && activeProfile.handedness[queryStringHandedness]) {
    handednessSelectorElement.value = queryStringHandedness;
  }

  // Manually trigger the handedness to change
  onHandednessSelected();
}

function loadCustomFiles(queryStringHandedness) {
  ensureInteractionDisabled();

  let profileFile;
  fileNamesElement.innerHTML = '';

  const fileList = Array.from(fileNamesSelectorElement.files);
  fileList.forEach((file) => {
    fileNamesElement.innerHTML += `
      <li>${file.name}</li>
    `;

    if (file.name === 'profile.json') {
      profileFile = file;
    } else {
      customProfileAssets[file.name] = window.URL.createObjectURL(file);
    }
  });

  if (!profileFile) {
    enableInteraction();
    ErrorLogging.log('No profile.json');
  }

  // Attempt to load the profile
  const reader = new FileReader();

  reader.onload = () => {
    const profile = JSON.parse(reader.result);
    onProfileLoaded(profile, queryStringHandedness);
  };

  reader.onerror = () => {
    enableInteraction();
    ErrorLogging.logAndThrow('Unable to load profile.json');
  };

  reader.readAsText(profileFile);
}

function onProfileIdSelected(queryStringHandedness) {
  // Get the selected profile id
  const profileId = profileSelectorElement.value;

  ensureInteractionDisabled();
  clear(/* saveProfile */ false);
  setUrl(profileId);

  handednessSelectorElement.innerHTML = `
    <option value='loading'>Loading...</option>
  `;

  // Attempt to load the profile
  if (profileId === 'custom') {
    // leave profile/handedness disabled until load complete
    fileNamesElement.disabled = false;
    loadCustomFiles(queryStringHandedness);
  } else {
    fileNamesElement.disabled = true;
    profiles.fetchProfile([profileId])
      .then((profile) => {
        onProfileLoaded(profile, queryStringHandedness);
      })
      .catch((error) => {
        enableInteraction();
        ErrorLogging.log(error.message);
        throw error;
      });
  }
}

function populateProfileSelector() {
  ensureInteractionDisabled();
  clear(/* saveProfile */ false);

  profiles.fetchSupportedProfilesList().then((profilesList) => {
    supportedProfilesList = profilesList;

    // Remove loading entry
    profileSelectorElement.innerHTML = '';

    if (supportedProfilesList.length > 0) {
      // Populate the selector with the profiles list
      supportedProfilesList.forEach((supportedProfile) => {
        profileSelectorElement.innerHTML += `
        <option value='${supportedProfile}'>${supportedProfile}</option>
        `;
      });
    }

    // Add the custom option at the end of the list
    profileSelectorElement.innerHTML += `
      <option value='custom'>Custom</option>
    `;

    // Get the optional query string parameters
    const queryStringProfileId = urlSearchParams.get('profileId');
    const queryStringHandedness = urlSearchParams.get('handedness');

    // Override the default selection if values in query string
    if (queryStringProfileId) {
      profileSelectorElement.value = queryStringProfileId;
    }

    // Manually trigger profile to load
    onProfileIdSelected(queryStringHandedness);
  });
}

function onLoad() {
  ModelViewer.initialize();

  profileSelectorElement = document.getElementById('profileSelector');
  handednessSelectorElement = document.getElementById('handednessSelector');
  fileNamesElement = document.getElementById('localFileNames');
  fileNamesSelectorElement = document.getElementById('localFilesSelector');

  populateProfileSelector();

  fileNamesSelectorElement.addEventListener('change', loadCustomFiles);
  profileSelectorElement.addEventListener('change', onProfileIdSelected);
  handednessSelectorElement.addEventListener('change', onHandednessSelected);
}
window.addEventListener('load', onLoad);
