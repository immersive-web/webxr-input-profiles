/* eslint import/no-unresolved: off */

import { Profiles } from '../dist/webxr-input-profiles.module.js';
import { MockGamepad, MockXRInputSource } from '../dist/webxr-input-mocks.module.js';
import ModelViewer from './modelViewer.js';
import ManualControls from './buildElements.js';
import ErrorLogging from './errorLogging.js';

const profiles = new Profiles('../dist/profiles');

const urlSearchParams = new URL(window.location).searchParams;

let supportedProfilesList;
let activeProfile;
let customProfileAssets = {};
const pageElements = {};

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
  pageElements.profileSelector.disabled = true;
  pageElements.handednessSelector.disabled = true;
  pageElements.fileNamesSelector.disabled = true;
}

function enableInteraction() {
  pageElements.profileSelector.disabled = false;
  pageElements.handednessSelector.disabled = false;
  pageElements.fileNamesSelector.disabled = (pageElements.profileSelector.value !== 'custom');
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
  setUrl(pageElements.profileSelector.value, pageElements.handednessSelector.value);
  clear(/* saveProfile */ true);

  // Create a mock gamepad that matches the profile and handedness
  const handedness = pageElements.handednessSelector.value;
  const mockGamepad = new MockGamepad(activeProfile, handedness);
  const mockXRInputSource = new MockXRInputSource(mockGamepad, handedness);
  if (pageElements.profileSelector.value === 'custom') {
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
  pageElements.handednessSelector.innerHTML = '';
  Object.keys(activeProfile.handedness).forEach((handedness) => {
    pageElements.handednessSelector.innerHTML += `
      <option value='${handedness}'>${handedness}</option>
    `;
  });

  // Apply handedness if supplied
  if (queryStringHandedness && activeProfile.handedness[queryStringHandedness]) {
    pageElements.handednessSelector.value = queryStringHandedness;
  }

  // Manually trigger the handedness to change
  onHandednessSelected();
}

function loadCustomFiles(queryStringHandedness) {
  ensureInteractionDisabled();

  let profileFile;
  pageElements.fileNames.innerHTML = '';

  const fileList = Array.from(pageElements.fileNamesSelector.files);
  fileList.forEach((file) => {
    pageElements.fileNames.innerHTML += `
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
  const profileId = pageElements.profileSelector.value;

  ensureInteractionDisabled();
  clear(/* saveProfile */ false);
  setUrl(profileId);

  pageElements.handednessSelector.innerHTML = `
    <option value='loading'>Loading...</option>
  `;

  // Attempt to load the profile
  if (profileId === 'custom') {
    // leave profile/handedness disabled until load complete
    pageElements.customProfile.hidden = false;
    loadCustomFiles(queryStringHandedness);
  } else {
    pageElements.customProfile.hidden = true;
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
    pageElements.profileSelector.innerHTML = '';

    if (supportedProfilesList.length > 0) {
      // Populate the selector with the profiles list
      supportedProfilesList.forEach((supportedProfile) => {
        pageElements.profileSelector.innerHTML += `
        <option value='${supportedProfile}'>${supportedProfile}</option>
        `;
      });
    }

    // Add the custom option at the end of the list
    pageElements.profileSelector.innerHTML += `
      <option value='custom'>Custom</option>
    `;

    // Get the optional query string parameters
    const queryStringProfileId = urlSearchParams.get('profileId');
    const queryStringHandedness = urlSearchParams.get('handedness');

    // Override the default selection if values in query string
    if (queryStringProfileId) {
      pageElements.profileSelector.value = queryStringProfileId;
    }

    // Manually trigger profile to load
    onProfileIdSelected(queryStringHandedness);
  });
}

function onLoad() {
  ModelViewer.initialize();

  pageElements.profileSelector = document.getElementById('profileSelector');
  pageElements.handednessSelector = document.getElementById('handednessSelector');
  pageElements.customProfile = document.getElementById('customProfile');
  pageElements.fileNames = document.getElementById('localFileNames');
  pageElements.fileNamesSelector = document.getElementById('localFilesSelector');

  populateProfileSelector();

  pageElements.fileNamesSelector.addEventListener('change', loadCustomFiles);
  pageElements.profileSelector.addEventListener('change', onProfileIdSelected);
  pageElements.handednessSelector.addEventListener('change', onHandednessSelected);
}
window.addEventListener('load', onLoad);
