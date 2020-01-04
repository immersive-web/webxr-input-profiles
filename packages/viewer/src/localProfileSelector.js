/* eslint-disable import/no-unresolved */
import { MotionController } from './motion-controllers.module.js';
import './ajv/ajv.min.js';
import validateRegistryProfile from './registryTools/validateRegistryProfile.js';
import expandRegistryProfile from './assetTools/expandRegistryProfile.js';
import buildAssetProfile from './assetTools/buildAssetProfile.js';
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
      ErrorLogging.log(errorMessage);
      reject(errorMessage);
    };

    reader.readAsText(jsonFile);
  });
}

async function buildSchemaValidator(schemasPath) {
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
    this.localFilesListElement = document.getElementById('localProfileFilesList');
    this.disabled = true;

    // Get the registry json selector and watch for changes
    this.filesSelector = document.getElementById('localProfileSelector');
    this.filesSelector.addEventListener('change', () => { this.onFilesSelected(); });

    // Add a handedness selector and listen for changes
    this.handednessSelector = new HandednessSelector('localProfile');
    this.handednessSelector.element.addEventListener('handednessChange', (event) => { this.onHandednessChange(event); });
    this.element.insertBefore(this.handednessSelector.element, this.localFilesListElement);

    this.clearSelectedProfile();

    buildSchemaValidator('registryTools/registrySchemas.json').then((registrySchemaValidator) => {
      this.registrySchemaValidator = registrySchemaValidator;
      buildSchemaValidator('assetTools/assetSchemas.json').then((assetSchemaValidator) => {
        this.assetSchemaValidator = assetSchemaValidator;
        this.onFilesSelected();
      });
    });
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
    this.registryJson = null;
    this.assetJson = null;
    this.mergedProfile = null;
    this.assets = [];
    this.handednessSelector.clearSelectedProfile();
  }

  /**
   * Responds to changes in selected handedness.
   * Creates a new motion controller for the combination of profile and handedness, and fires an
   * event to signal the change
   * @param {object} event
   */
  onHandednessChange() {
    if (!this.disabled) {
      let motionController;
      if (this.handednessSelector.handedness && this.mergedProfile) {
        const { handedness } = this.handednessSelector;
        const mockGamepad = new MockGamepad(this.mergedProfile, handedness);
        const mockXRInputSource = new MockXRInputSource(mockGamepad, handedness);

        const assetName = this.mergedProfile.layouts[handedness].assetPath;
        const assetUrl = this.assets[assetName];
        motionController = new MotionController(mockXRInputSource, this.mergedProfile, assetUrl);
      }

      const changeEvent = new CustomEvent('motionControllerChange', { detail: motionController });
      this.element.dispatchEvent(changeEvent);
    }
  }

  async mergeJsonProfiles() {
    if (this.registryJson && this.assetJson) {
      try {
        const expandedRegistryProfile = expandRegistryProfile(this.registryJson);
        this.mergedProfile = buildAssetProfile(this.assetJson, expandedRegistryProfile);
        this.handednessSelector.setSelectedProfile(this.mergedProfile);
      } catch (error) {
        ErrorLogging.log(error);
        throw error;
      }
    }
  }

  onFilesSelected() {
    if (!this.disabled && this.registrySchemaValidator && this.assetSchemaValidator) {
      this.handednessSelector.clearSelectedProfile();
      const filesList = Array.from(this.filesSelector.files);
      let assetProfileFile;
      let registryProfileFile;
      filesList.forEach((file) => {
        if (file.name.endsWith('.glb')) {
          this.assets[file.name] = window.URL.createObjectURL(file);
        } else if (file.name === 'profile.json') {
          assetProfileFile = file;
        } else if (file.name.endsWith('.json')) {
          registryProfileFile = file;
        }

        // List the files found
        this.localFilesListElement.innerHTML += `
          <li>${file.name}</li>
        `;
      });

      if (!registryProfileFile) {
        ErrorLogging.log('No registry profile selected');
        return;
      }

      loadLocalJson(registryProfileFile).then((registryJson) => {
        const isRegistryJsonValid = this.registrySchemaValidator(registryJson);
        if (!isRegistryJsonValid) {
          ErrorLogging.log(JSON.stringify(this.registrySchemaValidator.errors, null, 2));
          return;
        }

        try {
          validateRegistryProfile(registryJson);
        } catch (error) {
          ErrorLogging.log(error);
          throw error;
        }
        this.registryJson = registryJson;

        if (!assetProfileFile) {
          this.assetJson = { profileId: this.registryJson.profileId, overrides: {} };
          this.mergeJsonProfiles();
        } else {
          loadLocalJson(assetProfileFile).then((assetJson) => {
            const isAssetJsonValid = this.assetSchemaValidator(assetJson);
            if (!isAssetJsonValid) {
              ErrorLogging.log(JSON.stringify(this.assetSchemaValidator.errors, null, 2));
            } else {
              this.assetJson = assetJson;
              this.mergeJsonProfiles();
            }
          });
        }
      });
    }
  }
}

export default LocalProfileSelector;
