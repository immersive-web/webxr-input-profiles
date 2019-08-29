/* eslint-disable import/no-unresolved */
import { MotionController } from './motion-controllers.module.js';
/* eslint-enable */

import MockGamepad from './mocks/mockGamepad.js';
import MockXRInputSource from './mocks/mockXRInputSource.js';
import ErrorLogging from './errorLogging.js';
import HandednessSelector from './handednessSelector.js';

/**
 * Loads a profile from a set of local files
 */
class LocalProfileSelector {
  constructor() {
    this.element = document.getElementById('localProfile');

    // Gets the file selector and watch for changes
    this.filesSelector = document.getElementById('localProfilesSelector');
    this.filesSelector.addEventListener('change', () => { this.onFilesSelected(); });
    this.localFilesListElement = document.getElementById('localFilesList');

    // Add a handedness selector and listen for changes
    this.handednessSelector = new HandednessSelector('localProfile');
    this.handednessSelector.element.addEventListener('handednessChange', (event) => { this.onHandednessChange(event); });
    this.element.insertBefore(this.handednessSelector.element, this.localFilesListElement);

    this.assetFiles = {};

    this.disabled = true;
    this.clearSelectedProfile();
  }

  enable() {
    this.element.hidden = false;
    this.disabled = false;
    this.onFilesSelected();
  }

  disable() {
    this.element.hidden = true;
    this.disabled = true;
    this.clearSelectedProfile();
  }

  clearSelectedProfile() {
    ErrorLogging.clearAll();
    this.selectedProfile = null;
    this.assetFiles = {};
    this.element.disabled = true;
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
      if (handedness) {
        const mockGamepad = new MockGamepad(this.selectedProfile, handedness);
        const mockXRInputSource = new MockXRInputSource(mockGamepad, handedness);

        const assetName = this.selectedProfile.handedness[handedness].asset;
        const assetUrl = this.assetFiles[assetName];
        motionController = new MotionController(mockXRInputSource, this.selectedProfile, assetUrl);
      }

      const changeEvent = new CustomEvent('motionControllerChange', { detail: motionController });
      this.element.dispatchEvent(changeEvent);
    }
  }

  /**
   * Loads selected file from filesystem and sets it as the selected profile
   * @param {Object} profileFile
   */
  loadProfile(profileFile) {
    const reader = new FileReader();

    reader.onload = () => {
      this.selectedProfile = JSON.parse(reader.result);
      this.handednessSelector.setSelectedProfile(this.selectedProfile);
    };

    reader.onerror = () => {
      ErrorLogging.logAndThrow('Unable to load profile.json');
    };

    reader.onloadend = () => {
      this.disabled = false;
    };

    reader.readAsText(profileFile);
  }

  /**
   * Handles changes to the set of local files selected
   */
  onFilesSelected() {
    this.clearSelectedProfile();
    this.localFilesListElement.innerHTML = '';

    // Get files from local folder
    const fileList = Array.from(this.filesSelector.files);
    let profileFile;

    fileList.forEach((file) => {
      // List the files found
      this.localFilesListElement.innerHTML += `
        <li>${file.name}</li>
      `;

      // Grab the profile.json to load and stash the others as asset URIs
      if (file.name === 'profile.json') {
        profileFile = file;
      } else {
        this.assetFiles[file.name] = window.URL.createObjectURL(file);
      }
    });

    // Load the profile if one has been found
    if (profileFile) {
      this.loadProfile(profileFile);
    } else {
      this.element.disabled = false;
      ErrorLogging.log('No profile.json');
    }
  }
}

export default LocalProfileSelector;
