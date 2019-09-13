/* eslint-disable import/no-unresolved */
import { MotionController } from './motion-controllers.module.js';
import './ajv/ajv.min.js';
import mergeProfile from './profilesTools/mergeProfile.js';
/* eslint-enable */

import MockGamepad from './mocks/mockGamepad.js';
import MockXRInputSource from './mocks/mockXRInputSource.js';
import ErrorLogging from './errorLogging.js';
import HandednessSelector from './handednessSelector.js';

/**
 * Loads selected file from filesystem and sets it as the selected profile
 * @param {Object} jsonFile
 */
function loadLocalJson(jsonFile) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const json = JSON.parse(reader.result);
      resolve(json);
    };

    reader.onerror = () => {
      const errorMessage = `Unable to load JSON from ${jsonFile.name}`;
      ErrorLogging.logError(errorMessage);
      reject(errorMessage);
    };

    reader.readAsText(jsonFile);
  });
}

async function buildSchemaValidator() {
  const schemasPath = 'profilesTools/schemas.json';
  const response = await fetch(schemasPath);
  if (!response.ok) {
    ErrorLogging.throw(response.statusText);
  }

  // eslint-disable-next-line no-undef
  const ajv = new Ajv();
  const schemas = await response.json();
  schemas.dependencies.forEach((schema) => {
    ajv.addSchema(schema);
  });

  return ajv.compile(schemas.mainSchema);
}

/**
 * Loads a profile from a set of local files
 */
class LocalProfileSelector {
  constructor() {
    this.element = document.getElementById('localProfile');
    this.localFilesListElement = document.getElementById('localFilesList');

    // Get the assets selector and watch for changes
    this.registryJsonSelector = document.getElementById('localProfileRegistryJsonSelector');
    this.registryJsonSelector.addEventListener('change', () => { this.onRegistryJsonSelected(); });

    // Get the asset json  selector and watch for changes
    this.assetJsonSelector = document.getElementById('localProfileAssetJsonSelector');
    this.assetJsonSelector.addEventListener('change', () => { this.onAssetJsonSelected(); });

    // Get the registry json selector and watch for changes
    this.assetsSelector = document.getElementById('localProfileAssetsSelector');
    this.assetsSelector.addEventListener('change', () => { this.onAssetsSelected(); });

    // Add a handedness selector and listen for changes
    this.handednessSelector = new HandednessSelector('localProfile');
    this.handednessSelector.element.addEventListener('handednessChange', (event) => { this.onHandednessChange(event); });
    this.element.insertBefore(this.handednessSelector.element, this.localFilesListElement);

    this.disabled = true;

    this.clearSelectedProfile();

    buildSchemaValidator().then((schemaValidator) => {
      this.schemaValidator = schemaValidator;
      // TODO figure out disabled thing
      this.onRegistryJsonSelected();
      this.onAssetJsonSelected();
      this.onAssetsSelected();
    });
  }

  enable() {
    this.element.hidden = false;
    this.disabled = false;
  }

  disable() {
    this.element.hidden = true;
    this.disabled = true;
    this.clearSelectedProfile();
  }

  clearSelectedProfile() {
    ErrorLogging.clearAll();
    this.registryJson = null;
    this.assetJson = null;
    this.mergedProfile = null;
    this.assets = [];
    this.handednessSelector.clearSelectedProfile();
  }

  createMotionController() {
    let motionController;
    if (this.handednessSelector.handedness && this.mergedProfile) {
      const { handedness } = this.handednessSelector;
      const mockGamepad = new MockGamepad(this.mergedProfile, handedness);
      const mockXRInputSource = new MockXRInputSource(mockGamepad, handedness);

      const assetName = this.mergedProfile.layouts[handedness].path;
      const assetUrl = this.assets[assetName];
      motionController = new MotionController(mockXRInputSource, this.mergedProfile, assetUrl);
    }

    const changeEvent = new CustomEvent('motionControllerChange', { detail: motionController });
    this.element.dispatchEvent(changeEvent);
  }

  /**
   * Responds to changes in selected handedness.
   * Creates a new motion controller for the combination of profile and handedness, and fires an
   * event to signal the change
   * @param {object} event
   */
  onHandednessChange() {
    if (!this.disabled) {
      this.createMotionController();
    }
  }

  async mergeJsonProfiles() {
    if (this.registryJson && this.assetJson) {
      try {
        this.mergedProfile = mergeProfile(this.registryJson, this.assetJson);
        this.handednessSelector.setSelectedProfile(this.mergedProfile);
      } catch (error) {
        ErrorLogging.log(error);
        throw error;
      }
    }
  }

  onRegistryJsonSelected() {
    if (!this.element.disabled) {
      this.registryJson = null;
      this.mergedProfile = null;
      this.handednessSelector.clearSelectedProfile();
      if (this.registryJsonSelector.files.length > 0) {
        loadLocalJson(this.registryJsonSelector.files[0]).then((registryJson) => {
          // TODO validate JSON
          this.registryJson = registryJson;
          this.mergeJsonProfiles();
        });
      }
    }
  }

  onAssetJsonSelected() {
    if (!this.element.disabled) {
      this.assetJson = null;
      this.mergedProfile = null;
      this.handednessSelector.clearSelectedProfile();
      if (this.assetJsonSelector.files.length > 0) {
        loadLocalJson(this.assetJsonSelector.files[0]).then((assetJson) => {
          const valid = this.schemaValidator(assetJson);
          if (!valid) {
            ErrorLogging.log(this.schemaValidator.error);
          } else {
            this.assetJson = assetJson;
            this.mergeJsonProfiles();
          }
        });
      }
    }
  }

  /**
   * Handles changes to the set of local files selected
   */
  onAssetsSelected() {
    if (!this.element.disabled) {
      const fileList = Array.from(this.assetsSelector.files);
      this.assets = [];
      fileList.forEach((file) => {
        this.assets[file.name] = window.URL.createObjectURL(file);
      });
      this.createMotionController();
    }
  }
}

export default LocalProfileSelector;
