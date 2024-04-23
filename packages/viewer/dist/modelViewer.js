import { Object3D, SphereGeometry, MeshBasicMaterial, Mesh, PerspectiveCamera, Scene, Color, WebGLRenderer, sRGBEncoding, PMREMGenerator, UnsignedByteType, BufferGeometry, Float32BufferAttribute, LineBasicMaterial, VertexColors, AdditiveBlending, Line } from './three/build/three.module.js';
import { OrbitControls } from './three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from './three/examples/jsm/loaders/RGBELoader.js';
import { VRButton } from './three/examples/jsm/webxr/VRButton.js';
import { GLTFLoader } from './three/examples/jsm/loaders/GLTFLoader.js';
import { Constants, fetchProfilesList, fetchProfile, MotionController } from './motion-controllers.js';
import './ajv/ajv.min.js';
import validateRegistryProfile from './registryTools/validateRegistryProfile.js';
import expandRegistryProfile from './assetTools/expandRegistryProfile.js';
import buildAssetProfile from './assetTools/buildAssetProfile.js';

let motionController;
let mockGamepad;
let controlsListElement;

function updateText() {
  if (motionController) {
    Object.values(motionController.components).forEach((component) => {
      const dataElement = document.getElementById(`${component.id}_data`);
      dataElement.innerHTML = JSON.stringify(component.data, null, 2);
    });
  }
}

function onButtonValueChange(event) {
  const { index } = event.target.dataset;
  mockGamepad.buttons[index].value = Number(event.target.value);
}

function onAxisValueChange(event) {
  const { index } = event.target.dataset;
  mockGamepad.axes[index] = Number(event.target.value);
}

function clear() {
  motionController = undefined;
  mockGamepad = undefined;

  if (!controlsListElement) {
    controlsListElement = document.getElementById('controlsList');
  }
  controlsListElement.innerHTML = '';
}

function addButtonControls(componentControlsElement, buttonIndex) {
  const buttonControlsElement = document.createElement('div');
  buttonControlsElement.setAttribute('class', 'componentControls');

  buttonControlsElement.innerHTML += `
  <label>buttonValue</label>
  <input id="buttons[${buttonIndex}].value" data-index="${buttonIndex}" type="range" min="0" max="1" step="0.01" value="0">
  `;

  componentControlsElement.appendChild(buttonControlsElement);

  document.getElementById(`buttons[${buttonIndex}].value`).addEventListener('input', onButtonValueChange);
}

function addAxisControls(componentControlsElement, axisName, axisIndex) {
  const axisControlsElement = document.createElement('div');
  axisControlsElement.setAttribute('class', 'componentControls');

  axisControlsElement.innerHTML += `
  <label>${axisName}<label>
  <input id="axes[${axisIndex}]" data-index="${axisIndex}"
          type="range" min="-1" max="1" step="0.01" value="0">
  `;

  componentControlsElement.appendChild(axisControlsElement);

  document.getElementById(`axes[${axisIndex}]`).addEventListener('input', onAxisValueChange);
}

function build(sourceMotionController) {
  clear();

  motionController = sourceMotionController;
  mockGamepad = motionController.xrInputSource.gamepad;

  Object.values(motionController.components).forEach((component) => {
    const componentControlsElement = document.createElement('li');
    componentControlsElement.setAttribute('class', 'component');
    controlsListElement.appendChild(componentControlsElement);

    const headingElement = document.createElement('h4');
    headingElement.innerText = `${component.id}`;
    componentControlsElement.appendChild(headingElement);

    if (component.gamepadIndices.button !== undefined) {
      addButtonControls(componentControlsElement, component.gamepadIndices.button);
    }

    if (component.gamepadIndices.xAxis !== undefined) {
      addAxisControls(componentControlsElement, 'xAxis', component.gamepadIndices.xAxis);
    }

    if (component.gamepadIndices.yAxis !== undefined) {
      addAxisControls(componentControlsElement, 'yAxis', component.gamepadIndices.yAxis);
    }

    const dataElement = document.createElement('pre');
    dataElement.id = `${component.id}_data`;
    componentControlsElement.appendChild(dataElement);
  });
}

var ManualControls = { clear, build, updateText };

let errorsSectionElement;
let errorsListElement;
class AssetError extends Error {
  constructor(...params) {
    super(...params);
    AssetError.log(this.message);
  }

  static initialize() {
    errorsListElement = document.getElementById('errors');
    errorsSectionElement = document.getElementById('errors');
  }

  static log(errorMessage) {
    const itemElement = document.createElement('li');
    itemElement.innerText = errorMessage;
    errorsListElement.appendChild(itemElement);
    errorsSectionElement.hidden = false;
  }

  static clearAll() {
    errorsListElement.innerHTML = '';
    errorsSectionElement.hidden = true;
  }
}

/* eslint-disable import/no-unresolved */

const gltfLoader = new GLTFLoader();

class ControllerModel extends Object3D {
  constructor() {
    super();
    this.xrInputSource = null;
    this.motionController = null;
    this.asset = null;
    this.rootNode = null;
    this.nodes = {};
    this.loaded = false;
    this.envMap = null;
  }

  set environmentMap(value) {
    if (this.envMap === value) {
      return;
    }

    this.envMap = value;
    /* eslint-disable no-param-reassign */
    this.traverse((child) => {
      if (child.isMesh) {
        child.material.envMap = this.envMap;
        child.material.needsUpdate = true;
      }
    });
    /* eslint-enable */
  }

  get environmentMap() {
    return this.envMap;
  }

  async initialize(motionController) {
    this.motionController = motionController;
    this.xrInputSource = this.motionController.xrInputSource;

    // Fetch the assets and generate threejs objects for it
    this.asset = await new Promise(((resolve, reject) => {
      gltfLoader.load(
        motionController.assetUrl,
        (loadedAsset) => { resolve(loadedAsset); },
        null,
        () => { reject(new AssetError(`Asset ${motionController.assetUrl} missing or malformed.`)); }
      );
    }));

    if (this.envMap) {
      /* eslint-disable no-param-reassign */
      this.asset.scene.traverse((child) => {
        if (child.isMesh) {
          child.material.envMap = this.envMap;
        }
      });
      /* eslint-enable */
    }

    this.rootNode = this.asset.scene;
    this.addTouchDots();
    this.findNodes();
    this.add(this.rootNode);
    this.loaded = true;
  }

  /**
   * Polls data from the XRInputSource and updates the model's components to match
   * the real world data
   */
  updateMatrixWorld(force) {
    super.updateMatrixWorld(force);

    if (!this.loaded) {
      return;
    }

    // Cause the MotionController to poll the Gamepad for data
    this.motionController.updateFromGamepad();

    // Update the 3D model to reflect the button, thumbstick, and touchpad state
    Object.values(this.motionController.components).forEach((component) => {
      // Update node data based on the visual responses' current states
      Object.values(component.visualResponses).forEach((visualResponse) => {
        const {
          valueNodeName, minNodeName, maxNodeName, value, valueNodeProperty
        } = visualResponse;
        const valueNode = this.nodes[valueNodeName];

        // Skip if the visual response node is not found. No error is needed,
        // because it will have been reported at load time.
        if (!valueNode) return;

        // Calculate the new properties based on the weight supplied
        if (valueNodeProperty === Constants.VisualResponseProperty.VISIBILITY) {
          valueNode.visible = value;
        } else if (valueNodeProperty === Constants.VisualResponseProperty.TRANSFORM) {
          const minNode = this.nodes[minNodeName];
          const maxNode = this.nodes[maxNodeName];
          valueNode.quaternion.slerpQuaternions(
            minNode.quaternion,
            maxNode.quaternion,
            value
          );

          valueNode.position.lerpVectors(
            minNode.position,
            maxNode.position,
            value
          );
        }
      });
    });
  }

  /**
   * Walks the model's tree to find the nodes needed to animate the components and
   * saves them for use in the frame loop
   */
  findNodes() {
    this.nodes = {};

    // Loop through the components and find the nodes needed for each components' visual responses
    Object.values(this.motionController.components).forEach((component) => {
      const { touchPointNodeName, visualResponses } = component;
      if (touchPointNodeName) {
        this.nodes[touchPointNodeName] = this.rootNode.getObjectByName(touchPointNodeName);
      }

      // Loop through all the visual responses to be applied to this component
      Object.values(visualResponses).forEach((visualResponse) => {
        const {
          valueNodeName, minNodeName, maxNodeName, valueNodeProperty
        } = visualResponse;
        // If animating a transform, find the two nodes to be interpolated between.
        if (valueNodeProperty === Constants.VisualResponseProperty.TRANSFORM) {
          this.nodes[minNodeName] = this.rootNode.getObjectByName(minNodeName);
          this.nodes[maxNodeName] = this.rootNode.getObjectByName(maxNodeName);

          // If the extents cannot be found, skip this animation
          if (!this.nodes[minNodeName]) {
            AssetError.log(`Could not find ${minNodeName} in the model`);
            return;
          }
          if (!this.nodes[maxNodeName]) {
            AssetError.log(`Could not find ${maxNodeName} in the model`);
            return;
          }
        }

        // If the target node cannot be found, skip this animation
        this.nodes[valueNodeName] = this.rootNode.getObjectByName(valueNodeName);
        if (!this.nodes[valueNodeName]) {
          AssetError.log(`Could not find ${valueNodeName} in the model`);
        }
      });
    });
  }

  /**
   * Add touch dots to all touchpad components so the finger can be seen
   */
  addTouchDots() {
    Object.keys(this.motionController.components).forEach((componentId) => {
      const component = this.motionController.components[componentId];
      // Find the touchpads
      if (component.type === Constants.ComponentType.TOUCHPAD) {
        // Find the node to attach the touch dot.
        const touchPointRoot = this.rootNode.getObjectByName(component.touchPointNodeName, true);
        if (!touchPointRoot) {
          AssetError.log(`Could not find touch dot, ${component.touchPointNodeName}, in touchpad component ${componentId}`);
        } else {
          const sphereGeometry = new SphereGeometry(0.001);
          const material = new MeshBasicMaterial({ color: 0x0000FF });
          const sphere = new Mesh(sphereGeometry, material);
          touchPointRoot.add(sphere);
        }
      }
    });
  }
}

/* eslint-disable import/no-unresolved */

/**
 * Loads a profile from a set of local files
 */
class LocalProfile extends EventTarget {
  constructor() {
    super();

    this.localFilesListElement = document.getElementById('localFilesList');
    this.filesSelector = document.getElementById('localFilesSelector');
    this.filesSelector.addEventListener('change', () => {
      this.onFilesSelected();
    });

    this.clear();

    LocalProfile.buildSchemaValidator('registryTools/registrySchemas.json').then((registrySchemaValidator) => {
      this.registrySchemaValidator = registrySchemaValidator;
      LocalProfile.buildSchemaValidator('assetTools/assetSchemas.json').then((assetSchemaValidator) => {
        this.assetSchemaValidator = assetSchemaValidator;
        const duringPageLoad = true;
        this.onFilesSelected(duringPageLoad);
      });
    });
  }

  /**
   * Clears all local profile information
   */
  clear() {
    if (this.profile) {
      this.profile = null;
      this.profileId = null;
      this.assets = [];
      this.localFilesListElement.innerHTML = '';

      const changeEvent = new Event('localProfileChange');
      this.dispatchEvent(changeEvent);
    }
  }

  /**
   * Processes selected files and generates an asset profile
   * @param {boolean} duringPageLoad
   */
  async onFilesSelected(duringPageLoad) {
    this.clear();

    // Skip if initialzation is incomplete
    if (!this.assetSchemaValidator) {
      return;
    }

    // Examine the files selected to find the registry profile, asset overrides, and asset files
    const assets = [];
    let assetJsonFile;
    let registryJsonFile;

    const filesList = Array.from(this.filesSelector.files);
    filesList.forEach((file) => {
      if (file.name.endsWith('.glb')) {
        assets[file.name] = window.URL.createObjectURL(file);
      } else if (file.name === 'profile.json') {
        assetJsonFile = file;
      } else if (file.name.endsWith('.json')) {
        registryJsonFile = file;
      }

      // List the files found
      this.localFilesListElement.innerHTML += `
        <li>${file.name}</li>
      `;
    });

    if (!registryJsonFile) {
      AssetError.log('No registry profile selected');
      return;
    }

    await this.buildProfile(registryJsonFile, assetJsonFile, assets);
    this.assets = assets;

    // Change the selected profile to the one just loaded.  Do not do this on initial page load
    // because the selected files persists in firefox across refreshes, but the user may have
    // selected a different item from the dropdown
    if (!duringPageLoad) {
      window.localStorage.setItem('profileId', this.profileId);
    }

    // Notify that the local profile is ready for use
    const changeEvent = new Event('localprofilechange');
    this.dispatchEvent(changeEvent);
  }

  /**
   * Build a merged profile file from the registry profile and asset overrides
   * @param {*} registryJsonFile
   * @param {*} assetJsonFile
   */
  async buildProfile(registryJsonFile, assetJsonFile) {
    // Load the registry JSON and validate it against the schema
    const registryJson = await LocalProfile.loadLocalJson(registryJsonFile);
    const isRegistryJsonValid = this.registrySchemaValidator(registryJson);
    if (!isRegistryJsonValid) {
      throw new AssetError(JSON.stringify(this.registrySchemaValidator.errors, null, 2));
    }

    // Load the asset JSON and validate it against the schema.
    // If no asset JSON present, use the default definiton
    let assetJson;
    if (!assetJsonFile) {
      assetJson = { profileId: registryJson.profileId, overrides: {} };
    } else {
      assetJson = await LocalProfile.loadLocalJson(assetJsonFile);
      const isAssetJsonValid = this.assetSchemaValidator(assetJson);
      if (!isAssetJsonValid) {
        throw new AssetError(JSON.stringify(this.assetSchemaValidator.errors, null, 2));
      }
    }

    // Validate non-schema requirements and build a combined profile
    validateRegistryProfile(registryJson);
    const expandedRegistryProfile = expandRegistryProfile(registryJson);
    this.profile = buildAssetProfile(assetJson, expandedRegistryProfile);
    this.profileId = this.profile.profileId;
  }

  /**
   * Helper to load JSON from a local file
   * @param {File} jsonFile
   */
  static loadLocalJson(jsonFile) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const json = JSON.parse(reader.result);
        resolve(json);
      };

      reader.onerror = () => {
        const errorMessage = `Unable to load JSON from ${jsonFile.name}`;
        AssetError.log(errorMessage);
        reject(errorMessage);
      };

      reader.readAsText(jsonFile);
    });
  }

  /**
   * Helper to load the combined schema file and compile an AJV validator
   * @param {string} schemasPath
   */
  static async buildSchemaValidator(schemasPath) {
    const response = await fetch(schemasPath);
    if (!response.ok) {
      throw new AssetError(response.statusText);
    }

    // eslint-disable-next-line no-undef
    const ajv = new Ajv();
    const schemas = await response.json();
    schemas.dependencies.forEach((schema) => {
      ajv.addSchema(schema);
    });

    return ajv.compile(schemas.mainSchema);
  }
}

/* eslint-disable import/no-unresolved */

const profilesBasePath = './profiles';

/**
 * Loads profiles from the distribution folder next to the viewer's location
 */
class ProfileSelector extends EventTarget {
  constructor() {
    super();

    // Get the profile id selector and listen for changes
    this.profileIdSelectorElement = document.getElementById('profileIdSelector');
    this.profileIdSelectorElement.addEventListener('change', () => { this.onProfileIdChange(); });

    // Get the handedness selector and listen for changes
    this.handednessSelectorElement = document.getElementById('handednessSelector');
    this.handednessSelectorElement.addEventListener('change', () => { this.onHandednessChange(); });

    this.forceVRProfileElement = document.getElementById('forceVRProfile');
    this.showTargetRayElement = document.getElementById('showTargetRay');

    this.localProfile = new LocalProfile();
    this.localProfile.addEventListener('localprofilechange', (event) => { this.onLocalProfileChange(event); });

    this.profilesList = null;
    this.populateProfileSelector();
  }

  /**
   * Resets all selected profile state
   */
  clearSelectedProfile() {
    AssetError.clearAll();
    this.profile = null;
    this.handedness = null;
  }

  /**
   * Retrieves the full list of available profiles and populates the dropdown
   */
  async populateProfileSelector() {
    this.clearSelectedProfile();
    this.handednessSelectorElement.innerHTML = '';

    // Load and clear local storage
    const storedProfileId = window.localStorage.getItem('profileId');
    window.localStorage.removeItem('profileId');

    // Load the list of profiles
    if (!this.profilesList) {
      try {
        this.profileIdSelectorElement.innerHTML = '<option value="loading">Loading...</option>';
        this.profilesList = await fetchProfilesList(profilesBasePath);
      } catch (error) {
        this.profileIdSelectorElement.innerHTML = 'Failed to load list';
        AssetError.log(error.message);
        throw error;
      }
    }

    // Add each profile to the dropdown
    this.profileIdSelectorElement.innerHTML = '';
    Object.keys(this.profilesList).forEach((profileId) => {
      const profile = this.profilesList[profileId];
      if (!profile.deprecated) {
        this.profileIdSelectorElement.innerHTML += `
        <option value='${profileId}'>${profileId}</option>
        `;
      }
    });

    // Add the local profile if it isn't already included
    if (this.localProfile.profileId
     && !Object.keys(this.profilesList).includes(this.localProfile.profileId)) {
      this.profileIdSelectorElement.innerHTML += `
      <option value='${this.localProfile.profileId}'>${this.localProfile.profileId}</option>
      `;
      this.profilesList[this.localProfile.profileId] = this.localProfile;
    }

    // Override the default selection if values were present in local storage
    if (storedProfileId) {
      this.profileIdSelectorElement.value = storedProfileId;
    }

    // Manually trigger selected profile to load
    this.onProfileIdChange();
  }

  /**
   * Handler for the profile id selection change
   */
  onProfileIdChange() {
    this.clearSelectedProfile();
    this.handednessSelectorElement.innerHTML = '';

    const profileId = this.profileIdSelectorElement.value;
    window.localStorage.setItem('profileId', profileId);

    if (profileId === this.localProfile.profileId) {
      this.profile = this.localProfile.profile;
      this.populateHandednessSelector();
    } else {
      // Attempt to load the profile
      this.profileIdSelectorElement.disabled = true;
      this.handednessSelectorElement.disabled = true;
      fetchProfile({ profiles: [profileId], handedness: 'any' }, profilesBasePath, null, false).then(({ profile }) => {
        this.profile = profile;
        this.populateHandednessSelector();
      })
        .catch((error) => {
          AssetError.log(error.message);
          throw error;
        })
        .finally(() => {
          this.profileIdSelectorElement.disabled = false;
          this.handednessSelectorElement.disabled = false;
        });
    }
  }

  /**
   * Populates the handedness dropdown with those supported by the selected profile
   */
  populateHandednessSelector() {
    // Load and clear the last selection for this profile id
    const storedHandedness = window.localStorage.getItem('handedness');
    window.localStorage.removeItem('handedness');

    // Populate handedness selector
    Object.keys(this.profile.layouts).forEach((handedness) => {
      this.handednessSelectorElement.innerHTML += `
        <option value='${handedness}'>${handedness}</option>
      `;
    });

    // Apply stored handedness if found
    if (storedHandedness && this.profile.layouts[storedHandedness]) {
      this.handednessSelectorElement.value = storedHandedness;
    }

    // Manually trigger selected handedness change
    this.onHandednessChange();
  }

  /**
   * Responds to changes in selected handedness.
   * Creates a new motion controller for the combination of profile and handedness, and fires an
   * event to signal the change
   */
  onHandednessChange() {
    AssetError.clearAll();
    this.handedness = this.handednessSelectorElement.value;
    window.localStorage.setItem('handedness', this.handedness);
    if (this.handedness) {
      this.dispatchEvent(new Event('selectionchange'));
    } else {
      this.dispatchEvent(new Event('selectionclear'));
    }
  }

  /**
   * Updates the profiles dropdown to ensure local profile is in the list
   */
  onLocalProfileChange() {
    this.populateProfileSelector();
  }

  /**
   * Indicates if the currently selected profile should be shown in VR instead
   * of the profiles advertised by the real XRInputSource.
   */
  get forceVRProfile() {
    return this.forceVRProfileElement.checked;
  }

  /**
   * Indicates if the targetRaySpace for an input source should be visualized in
   * VR.
   */
  get showTargetRay() {
    return this.showTargetRayElement.checked;
  }

  /**
   * Builds a MotionController either based on the supplied input source using the local profile
   * if it is the best match, otherwise uses the remote assets
   * @param {XRInputSource} xrInputSource
   */
  async createMotionController(xrInputSource) {
    let profile;
    let assetPath;

    // Check if local override should be used
    let useLocalProfile = false;
    if (this.localProfile.profileId) {
      xrInputSource.profiles.some((profileId) => {
        const matchFound = Object.keys(this.profilesList).includes(profileId);
        useLocalProfile = matchFound && (profileId === this.localProfile.profileId);
        return matchFound;
      });
    }

    // Get profile and asset path
    if (useLocalProfile) {
      ({ profile } = this.localProfile);
      const assetName = this.localProfile.profile.layouts[xrInputSource.handedness].assetPath;
      assetPath = this.localProfile.assets[assetName] || assetName;
    } else {
      ({ profile, assetPath } = await fetchProfile(xrInputSource, profilesBasePath));
    }

    // Build motion controller
    const motionController = new MotionController(
      xrInputSource,
      profile,
      assetPath
    );

    return motionController;
  }
}

const defaultBackground = 'georgentor';

class BackgroundSelector extends EventTarget {
  constructor() {
    super();

    this.backgroundSelectorElement = document.getElementById('backgroundSelector');
    this.backgroundSelectorElement.addEventListener('change', () => { this.onBackgroundChange(); });

    this.selectedBackground = window.localStorage.getItem('background') || defaultBackground;
    this.backgroundList = {};
    fetch('backgrounds/backgrounds.json')
      .then(response => response.json())
      .then((backgrounds) => {
        this.backgroundList = backgrounds;
        Object.keys(backgrounds).forEach((background) => {
          const option = document.createElement('option');
          option.value = background;
          option.innerText = background;
          if (this.selectedBackground === background) {
            option.selected = true;
          }
          this.backgroundSelectorElement.appendChild(option);
        });
        this.dispatchEvent(new Event('selectionchange'));
      });
  }

  onBackgroundChange() {
    this.selectedBackground = this.backgroundSelectorElement.value;
    window.localStorage.setItem('background', this.selectedBackground);
    this.dispatchEvent(new Event('selectionchange'));
  }

  get backgroundPath() {
    return this.backgroundList[this.selectedBackground];
  }
}

/* eslint-disable import/no-unresolved */
/* eslint-enable */

/**
 * A false gamepad to be used in tests
 */
class MockGamepad {
  /**
   * @param {Object} profileDescription - The profile description to parse to determine the length
   * of the button and axes arrays
   * @param {string} handedness - The gamepad's handedness
   */
  constructor(profileDescription, handedness) {
    if (!profileDescription) {
      throw new Error('No profileDescription supplied');
    }

    if (!handedness) {
      throw new Error('No handedness supplied');
    }

    this.id = profileDescription.profileId;

    // Loop through the profile description to determine how many elements to put in the buttons
    // and axes arrays
    let maxButtonIndex = 0;
    let maxAxisIndex = 0;
    const layout = profileDescription.layouts[handedness];
    this.mapping = layout.mapping;
    Object.values(layout.components).forEach(({ gamepadIndices }) => {
      const {
        [Constants.ComponentProperty.BUTTON]: buttonIndex,
        [Constants.ComponentProperty.X_AXIS]: xAxisIndex,
        [Constants.ComponentProperty.Y_AXIS]: yAxisIndex
      } = gamepadIndices;

      if (buttonIndex !== undefined && buttonIndex > maxButtonIndex) {
        maxButtonIndex = buttonIndex;
      }

      if (xAxisIndex !== undefined && (xAxisIndex > maxAxisIndex)) {
        maxAxisIndex = xAxisIndex;
      }

      if (yAxisIndex !== undefined && (yAxisIndex > maxAxisIndex)) {
        maxAxisIndex = yAxisIndex;
      }
    });

    // Fill the axes array
    this.axes = [];
    while (this.axes.length <= maxAxisIndex) {
      this.axes.push(0);
    }

    // Fill the buttons array
    this.buttons = [];
    while (this.buttons.length <= maxButtonIndex) {
      this.buttons.push({
        value: 0,
        touched: false,
        pressed: false
      });
    }
  }
}

/**
 * A fake XRInputSource that can be used to initialize a MotionController
 */
class MockXRInputSource {
  /**
   * @param {Object} gamepad - The Gamepad object that provides the button and axis data
   * @param {string} handedness - The handedness to report
   */
  constructor(profiles, gamepad, handedness) {
    this.gamepad = gamepad;

    if (!handedness) {
      throw new Error('No handedness supplied');
    }

    this.handedness = handedness;
    this.profiles = Object.freeze(profiles);
  }
}

/* eslint-disable import/no-unresolved */

const three = {};
let canvasParentElement;
let vrProfilesElement;
let vrProfilesListElement;

let profileSelector;
let backgroundSelector;
let mockControllerModel;
let isImmersive = false;

/**
 * Adds the event handlers for VR motion controllers to load the assets on connection
 * and remove them on disconnection
 * @param {number} index
 */
function initializeVRController(index) {
  const vrControllerGrip = three.renderer.xr.getControllerGrip(index);

  vrControllerGrip.addEventListener('connected', async (event) => {
    const controllerModel = new ControllerModel();
    vrControllerGrip.add(controllerModel);

    let xrInputSource = event.data;

    vrProfilesListElement.innerHTML += `<li><b>${xrInputSource.handedness}:</b> [${xrInputSource.profiles}]</li>`;

    if (profileSelector.forceVRProfile) {
      xrInputSource = new MockXRInputSource(
        [profileSelector.profile.profileId], event.data.gamepad, event.data.handedness
      );
    }

    const motionController = await profileSelector.createMotionController(xrInputSource);
    await controllerModel.initialize(motionController);

    if (three.environmentMap) {
      controllerModel.environmentMap = three.environmentMap;
    }
  });

  vrControllerGrip.addEventListener('disconnected', () => {
    vrControllerGrip.remove(vrControllerGrip.children[0]);
  });

  three.scene.add(vrControllerGrip);

  const vrControllerTarget = three.renderer.xr.getController(index);

  vrControllerTarget.addEventListener('connected', () => {
    if (profileSelector.showTargetRay) {
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3));
      geometry.setAttribute('color', new Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3));

      const material = new LineBasicMaterial({
        vertexColors: VertexColors,
        blending: AdditiveBlending
      });

      vrControllerTarget.add(new Line(geometry, material));
    }
  });

  vrControllerTarget.addEventListener('disconnected', () => {
    if (vrControllerTarget.children.length) {
      vrControllerTarget.remove(vrControllerTarget.children[0]);
    }
  });

  three.scene.add(vrControllerTarget);
}

/**
 * The three.js render loop (used instead of requestAnimationFrame to support XR)
 */
function render() {
  if (mockControllerModel) {
    if (isImmersive) {
      three.scene.remove(mockControllerModel);
    } else {
      three.scene.add(mockControllerModel);
      ManualControls.updateText();
    }
  }

  three.cameraControls.update();

  three.renderer.render(three.scene, three.camera);
}

/**
 * @description Event handler for window resizing.
 */
function onResize() {
  const width = canvasParentElement.clientWidth;
  const height = canvasParentElement.clientHeight;
  three.camera.aspect = width / height;
  three.camera.updateProjectionMatrix();
  three.renderer.setSize(width, height);
  three.cameraControls.update();
}

/**
 * Initializes the three.js resources needed for this page
 */
function initializeThree() {
  canvasParentElement = document.getElementById('modelViewer');
  const width = canvasParentElement.clientWidth;
  const height = canvasParentElement.clientHeight;

  vrProfilesElement = document.getElementById('vrProfiles');
  vrProfilesListElement = document.getElementById('vrProfilesList');

  // Set up the THREE.js infrastructure
  three.camera = new PerspectiveCamera(75, width / height, 0.01, 1000);
  three.camera.position.y = 0.5;
  three.scene = new Scene();
  three.scene.background = new Color(0x00aa44);
  three.renderer = new WebGLRenderer({ antialias: true });
  three.renderer.setSize(width, height);
  three.renderer.outputEncoding = sRGBEncoding;

  // Set up the controls for moving the scene around
  three.cameraControls = new OrbitControls(three.camera, three.renderer.domElement);
  three.cameraControls.enableDamping = true;
  three.cameraControls.minDistance = 0.05;
  three.cameraControls.maxDistance = 0.3;
  three.cameraControls.enablePan = false;
  three.cameraControls.update();

  // Add VR
  canvasParentElement.appendChild(VRButton.createButton(three.renderer));
  three.renderer.xr.enabled = true;
  three.renderer.xr.addEventListener('sessionstart', () => {
    vrProfilesElement.hidden = false;
    vrProfilesListElement.innerHTML = '';
    isImmersive = true;
  });
  three.renderer.xr.addEventListener('sessionend', () => { isImmersive = false; });
  initializeVRController(0);
  initializeVRController(1);

  // Add the THREE.js canvas to the page
  canvasParentElement.appendChild(three.renderer.domElement);
  window.addEventListener('resize', onResize, false);

  // Start pumping frames
  three.renderer.setAnimationLoop(render);
}

function onSelectionClear() {
  ManualControls.clear();
  if (mockControllerModel) {
    three.scene.remove(mockControllerModel);
    mockControllerModel = null;
  }
}

async function onSelectionChange() {
  onSelectionClear();
  const mockGamepad = new MockGamepad(profileSelector.profile, profileSelector.handedness);
  const mockXRInputSource = new MockXRInputSource(
    [profileSelector.profile.profileId], mockGamepad, profileSelector.handedness
  );
  mockControllerModel = new ControllerModel(mockXRInputSource);
  three.scene.add(mockControllerModel);

  const motionController = await profileSelector.createMotionController(mockXRInputSource);
  ManualControls.build(motionController);
  await mockControllerModel.initialize(motionController);

  if (three.environmentMap) {
    mockControllerModel.environmentMap = three.environmentMap;
  }
}

async function onBackgroundChange() {
  const pmremGenerator = new PMREMGenerator(three.renderer);
  pmremGenerator.compileEquirectangularShader();

  await new Promise((resolve) => {
    const rgbeLoader = new RGBELoader();
    rgbeLoader.setDataType(UnsignedByteType);
    rgbeLoader.setPath('backgrounds/');
    rgbeLoader.load(backgroundSelector.backgroundPath, (texture) => {
      three.environmentMap = pmremGenerator.fromEquirectangular(texture).texture;
      three.scene.background = three.environmentMap;

      if (mockControllerModel) {
        mockControllerModel.environmentMap = three.environmentMap;
      }

      pmremGenerator.dispose();
      resolve(three.environmentMap);
    });
  });
}

/**
 * Page load handler for initialzing things that depend on the DOM to be ready
 */
function onLoad() {
  AssetError.initialize();
  profileSelector = new ProfileSelector();
  initializeThree();

  profileSelector.addEventListener('selectionclear', onSelectionClear);
  profileSelector.addEventListener('selectionchange', onSelectionChange);

  backgroundSelector = new BackgroundSelector();
  backgroundSelector.addEventListener('selectionchange', onBackgroundChange);
}
window.addEventListener('load', onLoad);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxWaWV3ZXIuanMiLCJzb3VyY2VzIjpbIi4uL3NyYy9tYW51YWxDb250cm9scy5qcyIsIi4uL3NyYy9hc3NldEVycm9yLmpzIiwiLi4vc3JjL2NvbnRyb2xsZXJNb2RlbC5qcyIsIi4uL3NyYy9sb2NhbFByb2ZpbGUuanMiLCIuLi9zcmMvcHJvZmlsZVNlbGVjdG9yLmpzIiwiLi4vc3JjL2JhY2tncm91bmRTZWxlY3Rvci5qcyIsIi4uL3NyYy9tb2Nrcy9tb2NrR2FtZXBhZC5qcyIsIi4uL3NyYy9tb2Nrcy9tb2NrWFJJbnB1dFNvdXJjZS5qcyIsIi4uL3NyYy9tb2RlbFZpZXdlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJsZXQgbW90aW9uQ29udHJvbGxlcjtcbmxldCBtb2NrR2FtZXBhZDtcbmxldCBjb250cm9sc0xpc3RFbGVtZW50O1xuXG5mdW5jdGlvbiB1cGRhdGVUZXh0KCkge1xuICBpZiAobW90aW9uQ29udHJvbGxlcikge1xuICAgIE9iamVjdC52YWx1ZXMobW90aW9uQ29udHJvbGxlci5jb21wb25lbnRzKS5mb3JFYWNoKChjb21wb25lbnQpID0+IHtcbiAgICAgIGNvbnN0IGRhdGFFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYCR7Y29tcG9uZW50LmlkfV9kYXRhYCk7XG4gICAgICBkYXRhRWxlbWVudC5pbm5lckhUTUwgPSBKU09OLnN0cmluZ2lmeShjb21wb25lbnQuZGF0YSwgbnVsbCwgMik7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gb25CdXR0b25WYWx1ZUNoYW5nZShldmVudCkge1xuICBjb25zdCB7IGluZGV4IH0gPSBldmVudC50YXJnZXQuZGF0YXNldDtcbiAgbW9ja0dhbWVwYWQuYnV0dG9uc1tpbmRleF0udmFsdWUgPSBOdW1iZXIoZXZlbnQudGFyZ2V0LnZhbHVlKTtcbn1cblxuZnVuY3Rpb24gb25BeGlzVmFsdWVDaGFuZ2UoZXZlbnQpIHtcbiAgY29uc3QgeyBpbmRleCB9ID0gZXZlbnQudGFyZ2V0LmRhdGFzZXQ7XG4gIG1vY2tHYW1lcGFkLmF4ZXNbaW5kZXhdID0gTnVtYmVyKGV2ZW50LnRhcmdldC52YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIGNsZWFyKCkge1xuICBtb3Rpb25Db250cm9sbGVyID0gdW5kZWZpbmVkO1xuICBtb2NrR2FtZXBhZCA9IHVuZGVmaW5lZDtcblxuICBpZiAoIWNvbnRyb2xzTGlzdEVsZW1lbnQpIHtcbiAgICBjb250cm9sc0xpc3RFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbnRyb2xzTGlzdCcpO1xuICB9XG4gIGNvbnRyb2xzTGlzdEVsZW1lbnQuaW5uZXJIVE1MID0gJyc7XG59XG5cbmZ1bmN0aW9uIGFkZEJ1dHRvbkNvbnRyb2xzKGNvbXBvbmVudENvbnRyb2xzRWxlbWVudCwgYnV0dG9uSW5kZXgpIHtcbiAgY29uc3QgYnV0dG9uQ29udHJvbHNFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGJ1dHRvbkNvbnRyb2xzRWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2NvbXBvbmVudENvbnRyb2xzJyk7XG5cbiAgYnV0dG9uQ29udHJvbHNFbGVtZW50LmlubmVySFRNTCArPSBgXG4gIDxsYWJlbD5idXR0b25WYWx1ZTwvbGFiZWw+XG4gIDxpbnB1dCBpZD1cImJ1dHRvbnNbJHtidXR0b25JbmRleH1dLnZhbHVlXCIgZGF0YS1pbmRleD1cIiR7YnV0dG9uSW5kZXh9XCIgdHlwZT1cInJhbmdlXCIgbWluPVwiMFwiIG1heD1cIjFcIiBzdGVwPVwiMC4wMVwiIHZhbHVlPVwiMFwiPlxuICBgO1xuXG4gIGNvbXBvbmVudENvbnRyb2xzRWxlbWVudC5hcHBlbmRDaGlsZChidXR0b25Db250cm9sc0VsZW1lbnQpO1xuXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGBidXR0b25zWyR7YnV0dG9uSW5kZXh9XS52YWx1ZWApLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0Jywgb25CdXR0b25WYWx1ZUNoYW5nZSk7XG59XG5cbmZ1bmN0aW9uIGFkZEF4aXNDb250cm9scyhjb21wb25lbnRDb250cm9sc0VsZW1lbnQsIGF4aXNOYW1lLCBheGlzSW5kZXgpIHtcbiAgY29uc3QgYXhpc0NvbnRyb2xzRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBheGlzQ29udHJvbHNFbGVtZW50LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnY29tcG9uZW50Q29udHJvbHMnKTtcblxuICBheGlzQ29udHJvbHNFbGVtZW50LmlubmVySFRNTCArPSBgXG4gIDxsYWJlbD4ke2F4aXNOYW1lfTxsYWJlbD5cbiAgPGlucHV0IGlkPVwiYXhlc1ske2F4aXNJbmRleH1dXCIgZGF0YS1pbmRleD1cIiR7YXhpc0luZGV4fVwiXG4gICAgICAgICAgdHlwZT1cInJhbmdlXCIgbWluPVwiLTFcIiBtYXg9XCIxXCIgc3RlcD1cIjAuMDFcIiB2YWx1ZT1cIjBcIj5cbiAgYDtcblxuICBjb21wb25lbnRDb250cm9sc0VsZW1lbnQuYXBwZW5kQ2hpbGQoYXhpc0NvbnRyb2xzRWxlbWVudCk7XG5cbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYGF4ZXNbJHtheGlzSW5kZXh9XWApLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0Jywgb25BeGlzVmFsdWVDaGFuZ2UpO1xufVxuXG5mdW5jdGlvbiBidWlsZChzb3VyY2VNb3Rpb25Db250cm9sbGVyKSB7XG4gIGNsZWFyKCk7XG5cbiAgbW90aW9uQ29udHJvbGxlciA9IHNvdXJjZU1vdGlvbkNvbnRyb2xsZXI7XG4gIG1vY2tHYW1lcGFkID0gbW90aW9uQ29udHJvbGxlci54cklucHV0U291cmNlLmdhbWVwYWQ7XG5cbiAgT2JqZWN0LnZhbHVlcyhtb3Rpb25Db250cm9sbGVyLmNvbXBvbmVudHMpLmZvckVhY2goKGNvbXBvbmVudCkgPT4ge1xuICAgIGNvbnN0IGNvbXBvbmVudENvbnRyb2xzRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG4gICAgY29tcG9uZW50Q29udHJvbHNFbGVtZW50LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnY29tcG9uZW50Jyk7XG4gICAgY29udHJvbHNMaXN0RWxlbWVudC5hcHBlbmRDaGlsZChjb21wb25lbnRDb250cm9sc0VsZW1lbnQpO1xuXG4gICAgY29uc3QgaGVhZGluZ0VsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdoNCcpO1xuICAgIGhlYWRpbmdFbGVtZW50LmlubmVyVGV4dCA9IGAke2NvbXBvbmVudC5pZH1gO1xuICAgIGNvbXBvbmVudENvbnRyb2xzRWxlbWVudC5hcHBlbmRDaGlsZChoZWFkaW5nRWxlbWVudCk7XG5cbiAgICBpZiAoY29tcG9uZW50LmdhbWVwYWRJbmRpY2VzLmJ1dHRvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBhZGRCdXR0b25Db250cm9scyhjb21wb25lbnRDb250cm9sc0VsZW1lbnQsIGNvbXBvbmVudC5nYW1lcGFkSW5kaWNlcy5idXR0b24pO1xuICAgIH1cblxuICAgIGlmIChjb21wb25lbnQuZ2FtZXBhZEluZGljZXMueEF4aXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgYWRkQXhpc0NvbnRyb2xzKGNvbXBvbmVudENvbnRyb2xzRWxlbWVudCwgJ3hBeGlzJywgY29tcG9uZW50LmdhbWVwYWRJbmRpY2VzLnhBeGlzKTtcbiAgICB9XG5cbiAgICBpZiAoY29tcG9uZW50LmdhbWVwYWRJbmRpY2VzLnlBeGlzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGFkZEF4aXNDb250cm9scyhjb21wb25lbnRDb250cm9sc0VsZW1lbnQsICd5QXhpcycsIGNvbXBvbmVudC5nYW1lcGFkSW5kaWNlcy55QXhpcyk7XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwcmUnKTtcbiAgICBkYXRhRWxlbWVudC5pZCA9IGAke2NvbXBvbmVudC5pZH1fZGF0YWA7XG4gICAgY29tcG9uZW50Q29udHJvbHNFbGVtZW50LmFwcGVuZENoaWxkKGRhdGFFbGVtZW50KTtcbiAgfSk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHsgY2xlYXIsIGJ1aWxkLCB1cGRhdGVUZXh0IH07XG4iLCJsZXQgZXJyb3JzU2VjdGlvbkVsZW1lbnQ7XG5sZXQgZXJyb3JzTGlzdEVsZW1lbnQ7XG5jbGFzcyBBc3NldEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvciguLi5wYXJhbXMpIHtcbiAgICBzdXBlciguLi5wYXJhbXMpO1xuICAgIEFzc2V0RXJyb3IubG9nKHRoaXMubWVzc2FnZSk7XG4gIH1cblxuICBzdGF0aWMgaW5pdGlhbGl6ZSgpIHtcbiAgICBlcnJvcnNMaXN0RWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdlcnJvcnMnKTtcbiAgICBlcnJvcnNTZWN0aW9uRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdlcnJvcnMnKTtcbiAgfVxuXG4gIHN0YXRpYyBsb2coZXJyb3JNZXNzYWdlKSB7XG4gICAgY29uc3QgaXRlbUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xuICAgIGl0ZW1FbGVtZW50LmlubmVyVGV4dCA9IGVycm9yTWVzc2FnZTtcbiAgICBlcnJvcnNMaXN0RWxlbWVudC5hcHBlbmRDaGlsZChpdGVtRWxlbWVudCk7XG4gICAgZXJyb3JzU2VjdGlvbkVsZW1lbnQuaGlkZGVuID0gZmFsc2U7XG4gIH1cblxuICBzdGF0aWMgY2xlYXJBbGwoKSB7XG4gICAgZXJyb3JzTGlzdEVsZW1lbnQuaW5uZXJIVE1MID0gJyc7XG4gICAgZXJyb3JzU2VjdGlvbkVsZW1lbnQuaGlkZGVuID0gdHJ1ZTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBBc3NldEVycm9yO1xuIiwiLyogZXNsaW50LWRpc2FibGUgaW1wb3J0L25vLXVucmVzb2x2ZWQgKi9cbmltcG9ydCAqIGFzIFRIUkVFIGZyb20gJy4vdGhyZWUvYnVpbGQvdGhyZWUubW9kdWxlLmpzJztcbmltcG9ydCB7IEdMVEZMb2FkZXIgfSBmcm9tICcuL3RocmVlL2V4YW1wbGVzL2pzbS9sb2FkZXJzL0dMVEZMb2FkZXIuanMnO1xuaW1wb3J0IHsgQ29uc3RhbnRzIH0gZnJvbSAnLi9tb3Rpb24tY29udHJvbGxlcnMuanMnO1xuLyogZXNsaW50LWVuYWJsZSAqL1xuXG5pbXBvcnQgQXNzZXRFcnJvciBmcm9tICcuL2Fzc2V0RXJyb3IuanMnO1xuXG5jb25zdCBnbHRmTG9hZGVyID0gbmV3IEdMVEZMb2FkZXIoKTtcblxuY2xhc3MgQ29udHJvbGxlck1vZGVsIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Qge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMueHJJbnB1dFNvdXJjZSA9IG51bGw7XG4gICAgdGhpcy5tb3Rpb25Db250cm9sbGVyID0gbnVsbDtcbiAgICB0aGlzLmFzc2V0ID0gbnVsbDtcbiAgICB0aGlzLnJvb3ROb2RlID0gbnVsbDtcbiAgICB0aGlzLm5vZGVzID0ge307XG4gICAgdGhpcy5sb2FkZWQgPSBmYWxzZTtcbiAgICB0aGlzLmVudk1hcCA9IG51bGw7XG4gIH1cblxuICBzZXQgZW52aXJvbm1lbnRNYXAodmFsdWUpIHtcbiAgICBpZiAodGhpcy5lbnZNYXAgPT09IHZhbHVlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5lbnZNYXAgPSB2YWx1ZTtcbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBuby1wYXJhbS1yZWFzc2lnbiAqL1xuICAgIHRoaXMudHJhdmVyc2UoKGNoaWxkKSA9PiB7XG4gICAgICBpZiAoY2hpbGQuaXNNZXNoKSB7XG4gICAgICAgIGNoaWxkLm1hdGVyaWFsLmVudk1hcCA9IHRoaXMuZW52TWFwO1xuICAgICAgICBjaGlsZC5tYXRlcmlhbC5uZWVkc1VwZGF0ZSA9IHRydWU7XG4gICAgICB9XG4gICAgfSk7XG4gICAgLyogZXNsaW50LWVuYWJsZSAqL1xuICB9XG5cbiAgZ2V0IGVudmlyb25tZW50TWFwKCkge1xuICAgIHJldHVybiB0aGlzLmVudk1hcDtcbiAgfVxuXG4gIGFzeW5jIGluaXRpYWxpemUobW90aW9uQ29udHJvbGxlcikge1xuICAgIHRoaXMubW90aW9uQ29udHJvbGxlciA9IG1vdGlvbkNvbnRyb2xsZXI7XG4gICAgdGhpcy54cklucHV0U291cmNlID0gdGhpcy5tb3Rpb25Db250cm9sbGVyLnhySW5wdXRTb3VyY2U7XG5cbiAgICAvLyBGZXRjaCB0aGUgYXNzZXRzIGFuZCBnZW5lcmF0ZSB0aHJlZWpzIG9iamVjdHMgZm9yIGl0XG4gICAgdGhpcy5hc3NldCA9IGF3YWl0IG5ldyBQcm9taXNlKCgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBnbHRmTG9hZGVyLmxvYWQoXG4gICAgICAgIG1vdGlvbkNvbnRyb2xsZXIuYXNzZXRVcmwsXG4gICAgICAgIChsb2FkZWRBc3NldCkgPT4geyByZXNvbHZlKGxvYWRlZEFzc2V0KTsgfSxcbiAgICAgICAgbnVsbCxcbiAgICAgICAgKCkgPT4geyByZWplY3QobmV3IEFzc2V0RXJyb3IoYEFzc2V0ICR7bW90aW9uQ29udHJvbGxlci5hc3NldFVybH0gbWlzc2luZyBvciBtYWxmb3JtZWQuYCkpOyB9XG4gICAgICApO1xuICAgIH0pKTtcblxuICAgIGlmICh0aGlzLmVudk1hcCkge1xuICAgICAgLyogZXNsaW50LWRpc2FibGUgbm8tcGFyYW0tcmVhc3NpZ24gKi9cbiAgICAgIHRoaXMuYXNzZXQuc2NlbmUudHJhdmVyc2UoKGNoaWxkKSA9PiB7XG4gICAgICAgIGlmIChjaGlsZC5pc01lc2gpIHtcbiAgICAgICAgICBjaGlsZC5tYXRlcmlhbC5lbnZNYXAgPSB0aGlzLmVudk1hcDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICAvKiBlc2xpbnQtZW5hYmxlICovXG4gICAgfVxuXG4gICAgdGhpcy5yb290Tm9kZSA9IHRoaXMuYXNzZXQuc2NlbmU7XG4gICAgdGhpcy5hZGRUb3VjaERvdHMoKTtcbiAgICB0aGlzLmZpbmROb2RlcygpO1xuICAgIHRoaXMuYWRkKHRoaXMucm9vdE5vZGUpO1xuICAgIHRoaXMubG9hZGVkID0gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQb2xscyBkYXRhIGZyb20gdGhlIFhSSW5wdXRTb3VyY2UgYW5kIHVwZGF0ZXMgdGhlIG1vZGVsJ3MgY29tcG9uZW50cyB0byBtYXRjaFxuICAgKiB0aGUgcmVhbCB3b3JsZCBkYXRhXG4gICAqL1xuICB1cGRhdGVNYXRyaXhXb3JsZChmb3JjZSkge1xuICAgIHN1cGVyLnVwZGF0ZU1hdHJpeFdvcmxkKGZvcmNlKTtcblxuICAgIGlmICghdGhpcy5sb2FkZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBDYXVzZSB0aGUgTW90aW9uQ29udHJvbGxlciB0byBwb2xsIHRoZSBHYW1lcGFkIGZvciBkYXRhXG4gICAgdGhpcy5tb3Rpb25Db250cm9sbGVyLnVwZGF0ZUZyb21HYW1lcGFkKCk7XG5cbiAgICAvLyBVcGRhdGUgdGhlIDNEIG1vZGVsIHRvIHJlZmxlY3QgdGhlIGJ1dHRvbiwgdGh1bWJzdGljaywgYW5kIHRvdWNocGFkIHN0YXRlXG4gICAgT2JqZWN0LnZhbHVlcyh0aGlzLm1vdGlvbkNvbnRyb2xsZXIuY29tcG9uZW50cykuZm9yRWFjaCgoY29tcG9uZW50KSA9PiB7XG4gICAgICAvLyBVcGRhdGUgbm9kZSBkYXRhIGJhc2VkIG9uIHRoZSB2aXN1YWwgcmVzcG9uc2VzJyBjdXJyZW50IHN0YXRlc1xuICAgICAgT2JqZWN0LnZhbHVlcyhjb21wb25lbnQudmlzdWFsUmVzcG9uc2VzKS5mb3JFYWNoKCh2aXN1YWxSZXNwb25zZSkgPT4ge1xuICAgICAgICBjb25zdCB7XG4gICAgICAgICAgdmFsdWVOb2RlTmFtZSwgbWluTm9kZU5hbWUsIG1heE5vZGVOYW1lLCB2YWx1ZSwgdmFsdWVOb2RlUHJvcGVydHlcbiAgICAgICAgfSA9IHZpc3VhbFJlc3BvbnNlO1xuICAgICAgICBjb25zdCB2YWx1ZU5vZGUgPSB0aGlzLm5vZGVzW3ZhbHVlTm9kZU5hbWVdO1xuXG4gICAgICAgIC8vIFNraXAgaWYgdGhlIHZpc3VhbCByZXNwb25zZSBub2RlIGlzIG5vdCBmb3VuZC4gTm8gZXJyb3IgaXMgbmVlZGVkLFxuICAgICAgICAvLyBiZWNhdXNlIGl0IHdpbGwgaGF2ZSBiZWVuIHJlcG9ydGVkIGF0IGxvYWQgdGltZS5cbiAgICAgICAgaWYgKCF2YWx1ZU5vZGUpIHJldHVybjtcblxuICAgICAgICAvLyBDYWxjdWxhdGUgdGhlIG5ldyBwcm9wZXJ0aWVzIGJhc2VkIG9uIHRoZSB3ZWlnaHQgc3VwcGxpZWRcbiAgICAgICAgaWYgKHZhbHVlTm9kZVByb3BlcnR5ID09PSBDb25zdGFudHMuVmlzdWFsUmVzcG9uc2VQcm9wZXJ0eS5WSVNJQklMSVRZKSB7XG4gICAgICAgICAgdmFsdWVOb2RlLnZpc2libGUgPSB2YWx1ZTtcbiAgICAgICAgfSBlbHNlIGlmICh2YWx1ZU5vZGVQcm9wZXJ0eSA9PT0gQ29uc3RhbnRzLlZpc3VhbFJlc3BvbnNlUHJvcGVydHkuVFJBTlNGT1JNKSB7XG4gICAgICAgICAgY29uc3QgbWluTm9kZSA9IHRoaXMubm9kZXNbbWluTm9kZU5hbWVdO1xuICAgICAgICAgIGNvbnN0IG1heE5vZGUgPSB0aGlzLm5vZGVzW21heE5vZGVOYW1lXTtcbiAgICAgICAgICB2YWx1ZU5vZGUucXVhdGVybmlvbi5zbGVycFF1YXRlcm5pb25zKFxuICAgICAgICAgICAgbWluTm9kZS5xdWF0ZXJuaW9uLFxuICAgICAgICAgICAgbWF4Tm9kZS5xdWF0ZXJuaW9uLFxuICAgICAgICAgICAgdmFsdWVcbiAgICAgICAgICApO1xuXG4gICAgICAgICAgdmFsdWVOb2RlLnBvc2l0aW9uLmxlcnBWZWN0b3JzKFxuICAgICAgICAgICAgbWluTm9kZS5wb3NpdGlvbixcbiAgICAgICAgICAgIG1heE5vZGUucG9zaXRpb24sXG4gICAgICAgICAgICB2YWx1ZVxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFdhbGtzIHRoZSBtb2RlbCdzIHRyZWUgdG8gZmluZCB0aGUgbm9kZXMgbmVlZGVkIHRvIGFuaW1hdGUgdGhlIGNvbXBvbmVudHMgYW5kXG4gICAqIHNhdmVzIHRoZW0gZm9yIHVzZSBpbiB0aGUgZnJhbWUgbG9vcFxuICAgKi9cbiAgZmluZE5vZGVzKCkge1xuICAgIHRoaXMubm9kZXMgPSB7fTtcblxuICAgIC8vIExvb3AgdGhyb3VnaCB0aGUgY29tcG9uZW50cyBhbmQgZmluZCB0aGUgbm9kZXMgbmVlZGVkIGZvciBlYWNoIGNvbXBvbmVudHMnIHZpc3VhbCByZXNwb25zZXNcbiAgICBPYmplY3QudmFsdWVzKHRoaXMubW90aW9uQ29udHJvbGxlci5jb21wb25lbnRzKS5mb3JFYWNoKChjb21wb25lbnQpID0+IHtcbiAgICAgIGNvbnN0IHsgdG91Y2hQb2ludE5vZGVOYW1lLCB2aXN1YWxSZXNwb25zZXMgfSA9IGNvbXBvbmVudDtcbiAgICAgIGlmICh0b3VjaFBvaW50Tm9kZU5hbWUpIHtcbiAgICAgICAgdGhpcy5ub2Rlc1t0b3VjaFBvaW50Tm9kZU5hbWVdID0gdGhpcy5yb290Tm9kZS5nZXRPYmplY3RCeU5hbWUodG91Y2hQb2ludE5vZGVOYW1lKTtcbiAgICAgIH1cblxuICAgICAgLy8gTG9vcCB0aHJvdWdoIGFsbCB0aGUgdmlzdWFsIHJlc3BvbnNlcyB0byBiZSBhcHBsaWVkIHRvIHRoaXMgY29tcG9uZW50XG4gICAgICBPYmplY3QudmFsdWVzKHZpc3VhbFJlc3BvbnNlcykuZm9yRWFjaCgodmlzdWFsUmVzcG9uc2UpID0+IHtcbiAgICAgICAgY29uc3Qge1xuICAgICAgICAgIHZhbHVlTm9kZU5hbWUsIG1pbk5vZGVOYW1lLCBtYXhOb2RlTmFtZSwgdmFsdWVOb2RlUHJvcGVydHlcbiAgICAgICAgfSA9IHZpc3VhbFJlc3BvbnNlO1xuICAgICAgICAvLyBJZiBhbmltYXRpbmcgYSB0cmFuc2Zvcm0sIGZpbmQgdGhlIHR3byBub2RlcyB0byBiZSBpbnRlcnBvbGF0ZWQgYmV0d2Vlbi5cbiAgICAgICAgaWYgKHZhbHVlTm9kZVByb3BlcnR5ID09PSBDb25zdGFudHMuVmlzdWFsUmVzcG9uc2VQcm9wZXJ0eS5UUkFOU0ZPUk0pIHtcbiAgICAgICAgICB0aGlzLm5vZGVzW21pbk5vZGVOYW1lXSA9IHRoaXMucm9vdE5vZGUuZ2V0T2JqZWN0QnlOYW1lKG1pbk5vZGVOYW1lKTtcbiAgICAgICAgICB0aGlzLm5vZGVzW21heE5vZGVOYW1lXSA9IHRoaXMucm9vdE5vZGUuZ2V0T2JqZWN0QnlOYW1lKG1heE5vZGVOYW1lKTtcblxuICAgICAgICAgIC8vIElmIHRoZSBleHRlbnRzIGNhbm5vdCBiZSBmb3VuZCwgc2tpcCB0aGlzIGFuaW1hdGlvblxuICAgICAgICAgIGlmICghdGhpcy5ub2Rlc1ttaW5Ob2RlTmFtZV0pIHtcbiAgICAgICAgICAgIEFzc2V0RXJyb3IubG9nKGBDb3VsZCBub3QgZmluZCAke21pbk5vZGVOYW1lfSBpbiB0aGUgbW9kZWxgKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCF0aGlzLm5vZGVzW21heE5vZGVOYW1lXSkge1xuICAgICAgICAgICAgQXNzZXRFcnJvci5sb2coYENvdWxkIG5vdCBmaW5kICR7bWF4Tm9kZU5hbWV9IGluIHRoZSBtb2RlbGApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHRoZSB0YXJnZXQgbm9kZSBjYW5ub3QgYmUgZm91bmQsIHNraXAgdGhpcyBhbmltYXRpb25cbiAgICAgICAgdGhpcy5ub2Rlc1t2YWx1ZU5vZGVOYW1lXSA9IHRoaXMucm9vdE5vZGUuZ2V0T2JqZWN0QnlOYW1lKHZhbHVlTm9kZU5hbWUpO1xuICAgICAgICBpZiAoIXRoaXMubm9kZXNbdmFsdWVOb2RlTmFtZV0pIHtcbiAgICAgICAgICBBc3NldEVycm9yLmxvZyhgQ291bGQgbm90IGZpbmQgJHt2YWx1ZU5vZGVOYW1lfSBpbiB0aGUgbW9kZWxgKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkIHRvdWNoIGRvdHMgdG8gYWxsIHRvdWNocGFkIGNvbXBvbmVudHMgc28gdGhlIGZpbmdlciBjYW4gYmUgc2VlblxuICAgKi9cbiAgYWRkVG91Y2hEb3RzKCkge1xuICAgIE9iamVjdC5rZXlzKHRoaXMubW90aW9uQ29udHJvbGxlci5jb21wb25lbnRzKS5mb3JFYWNoKChjb21wb25lbnRJZCkgPT4ge1xuICAgICAgY29uc3QgY29tcG9uZW50ID0gdGhpcy5tb3Rpb25Db250cm9sbGVyLmNvbXBvbmVudHNbY29tcG9uZW50SWRdO1xuICAgICAgLy8gRmluZCB0aGUgdG91Y2hwYWRzXG4gICAgICBpZiAoY29tcG9uZW50LnR5cGUgPT09IENvbnN0YW50cy5Db21wb25lbnRUeXBlLlRPVUNIUEFEKSB7XG4gICAgICAgIC8vIEZpbmQgdGhlIG5vZGUgdG8gYXR0YWNoIHRoZSB0b3VjaCBkb3QuXG4gICAgICAgIGNvbnN0IHRvdWNoUG9pbnRSb290ID0gdGhpcy5yb290Tm9kZS5nZXRPYmplY3RCeU5hbWUoY29tcG9uZW50LnRvdWNoUG9pbnROb2RlTmFtZSwgdHJ1ZSk7XG4gICAgICAgIGlmICghdG91Y2hQb2ludFJvb3QpIHtcbiAgICAgICAgICBBc3NldEVycm9yLmxvZyhgQ291bGQgbm90IGZpbmQgdG91Y2ggZG90LCAke2NvbXBvbmVudC50b3VjaFBvaW50Tm9kZU5hbWV9LCBpbiB0b3VjaHBhZCBjb21wb25lbnQgJHtjb21wb25lbnRJZH1gKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBzcGhlcmVHZW9tZXRyeSA9IG5ldyBUSFJFRS5TcGhlcmVHZW9tZXRyeSgwLjAwMSk7XG4gICAgICAgICAgY29uc3QgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoeyBjb2xvcjogMHgwMDAwRkYgfSk7XG4gICAgICAgICAgY29uc3Qgc3BoZXJlID0gbmV3IFRIUkVFLk1lc2goc3BoZXJlR2VvbWV0cnksIG1hdGVyaWFsKTtcbiAgICAgICAgICB0b3VjaFBvaW50Um9vdC5hZGQoc3BoZXJlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IENvbnRyb2xsZXJNb2RlbDtcbiIsIi8qIGVzbGludC1kaXNhYmxlIGltcG9ydC9uby11bnJlc29sdmVkICovXG5pbXBvcnQgJy4vYWp2L2Fqdi5taW4uanMnO1xuaW1wb3J0IHZhbGlkYXRlUmVnaXN0cnlQcm9maWxlIGZyb20gJy4vcmVnaXN0cnlUb29scy92YWxpZGF0ZVJlZ2lzdHJ5UHJvZmlsZS5qcyc7XG5pbXBvcnQgZXhwYW5kUmVnaXN0cnlQcm9maWxlIGZyb20gJy4vYXNzZXRUb29scy9leHBhbmRSZWdpc3RyeVByb2ZpbGUuanMnO1xuaW1wb3J0IGJ1aWxkQXNzZXRQcm9maWxlIGZyb20gJy4vYXNzZXRUb29scy9idWlsZEFzc2V0UHJvZmlsZS5qcyc7XG4vKiBlc2xpbnQtZW5hYmxlICovXG5cbmltcG9ydCBBc3NldEVycm9yIGZyb20gJy4vYXNzZXRFcnJvci5qcyc7XG5cbi8qKlxuICogTG9hZHMgYSBwcm9maWxlIGZyb20gYSBzZXQgb2YgbG9jYWwgZmlsZXNcbiAqL1xuY2xhc3MgTG9jYWxQcm9maWxlIGV4dGVuZHMgRXZlbnRUYXJnZXQge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcigpO1xuXG4gICAgdGhpcy5sb2NhbEZpbGVzTGlzdEVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9jYWxGaWxlc0xpc3QnKTtcbiAgICB0aGlzLmZpbGVzU2VsZWN0b3IgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9jYWxGaWxlc1NlbGVjdG9yJyk7XG4gICAgdGhpcy5maWxlc1NlbGVjdG9yLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsICgpID0+IHtcbiAgICAgIHRoaXMub25GaWxlc1NlbGVjdGVkKCk7XG4gICAgfSk7XG5cbiAgICB0aGlzLmNsZWFyKCk7XG5cbiAgICBMb2NhbFByb2ZpbGUuYnVpbGRTY2hlbWFWYWxpZGF0b3IoJ3JlZ2lzdHJ5VG9vbHMvcmVnaXN0cnlTY2hlbWFzLmpzb24nKS50aGVuKChyZWdpc3RyeVNjaGVtYVZhbGlkYXRvcikgPT4ge1xuICAgICAgdGhpcy5yZWdpc3RyeVNjaGVtYVZhbGlkYXRvciA9IHJlZ2lzdHJ5U2NoZW1hVmFsaWRhdG9yO1xuICAgICAgTG9jYWxQcm9maWxlLmJ1aWxkU2NoZW1hVmFsaWRhdG9yKCdhc3NldFRvb2xzL2Fzc2V0U2NoZW1hcy5qc29uJykudGhlbigoYXNzZXRTY2hlbWFWYWxpZGF0b3IpID0+IHtcbiAgICAgICAgdGhpcy5hc3NldFNjaGVtYVZhbGlkYXRvciA9IGFzc2V0U2NoZW1hVmFsaWRhdG9yO1xuICAgICAgICBjb25zdCBkdXJpbmdQYWdlTG9hZCA9IHRydWU7XG4gICAgICAgIHRoaXMub25GaWxlc1NlbGVjdGVkKGR1cmluZ1BhZ2VMb2FkKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFycyBhbGwgbG9jYWwgcHJvZmlsZSBpbmZvcm1hdGlvblxuICAgKi9cbiAgY2xlYXIoKSB7XG4gICAgaWYgKHRoaXMucHJvZmlsZSkge1xuICAgICAgdGhpcy5wcm9maWxlID0gbnVsbDtcbiAgICAgIHRoaXMucHJvZmlsZUlkID0gbnVsbDtcbiAgICAgIHRoaXMuYXNzZXRzID0gW107XG4gICAgICB0aGlzLmxvY2FsRmlsZXNMaXN0RWxlbWVudC5pbm5lckhUTUwgPSAnJztcblxuICAgICAgY29uc3QgY2hhbmdlRXZlbnQgPSBuZXcgRXZlbnQoJ2xvY2FsUHJvZmlsZUNoYW5nZScpO1xuICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KGNoYW5nZUV2ZW50KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUHJvY2Vzc2VzIHNlbGVjdGVkIGZpbGVzIGFuZCBnZW5lcmF0ZXMgYW4gYXNzZXQgcHJvZmlsZVxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IGR1cmluZ1BhZ2VMb2FkXG4gICAqL1xuICBhc3luYyBvbkZpbGVzU2VsZWN0ZWQoZHVyaW5nUGFnZUxvYWQpIHtcbiAgICB0aGlzLmNsZWFyKCk7XG5cbiAgICAvLyBTa2lwIGlmIGluaXRpYWx6YXRpb24gaXMgaW5jb21wbGV0ZVxuICAgIGlmICghdGhpcy5hc3NldFNjaGVtYVZhbGlkYXRvcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIEV4YW1pbmUgdGhlIGZpbGVzIHNlbGVjdGVkIHRvIGZpbmQgdGhlIHJlZ2lzdHJ5IHByb2ZpbGUsIGFzc2V0IG92ZXJyaWRlcywgYW5kIGFzc2V0IGZpbGVzXG4gICAgY29uc3QgYXNzZXRzID0gW107XG4gICAgbGV0IGFzc2V0SnNvbkZpbGU7XG4gICAgbGV0IHJlZ2lzdHJ5SnNvbkZpbGU7XG5cbiAgICBjb25zdCBmaWxlc0xpc3QgPSBBcnJheS5mcm9tKHRoaXMuZmlsZXNTZWxlY3Rvci5maWxlcyk7XG4gICAgZmlsZXNMaXN0LmZvckVhY2goKGZpbGUpID0+IHtcbiAgICAgIGlmIChmaWxlLm5hbWUuZW5kc1dpdGgoJy5nbGInKSkge1xuICAgICAgICBhc3NldHNbZmlsZS5uYW1lXSA9IHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKGZpbGUpO1xuICAgICAgfSBlbHNlIGlmIChmaWxlLm5hbWUgPT09ICdwcm9maWxlLmpzb24nKSB7XG4gICAgICAgIGFzc2V0SnNvbkZpbGUgPSBmaWxlO1xuICAgICAgfSBlbHNlIGlmIChmaWxlLm5hbWUuZW5kc1dpdGgoJy5qc29uJykpIHtcbiAgICAgICAgcmVnaXN0cnlKc29uRmlsZSA9IGZpbGU7XG4gICAgICB9XG5cbiAgICAgIC8vIExpc3QgdGhlIGZpbGVzIGZvdW5kXG4gICAgICB0aGlzLmxvY2FsRmlsZXNMaXN0RWxlbWVudC5pbm5lckhUTUwgKz0gYFxuICAgICAgICA8bGk+JHtmaWxlLm5hbWV9PC9saT5cbiAgICAgIGA7XG4gICAgfSk7XG5cbiAgICBpZiAoIXJlZ2lzdHJ5SnNvbkZpbGUpIHtcbiAgICAgIEFzc2V0RXJyb3IubG9nKCdObyByZWdpc3RyeSBwcm9maWxlIHNlbGVjdGVkJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5idWlsZFByb2ZpbGUocmVnaXN0cnlKc29uRmlsZSwgYXNzZXRKc29uRmlsZSwgYXNzZXRzKTtcbiAgICB0aGlzLmFzc2V0cyA9IGFzc2V0cztcblxuICAgIC8vIENoYW5nZSB0aGUgc2VsZWN0ZWQgcHJvZmlsZSB0byB0aGUgb25lIGp1c3QgbG9hZGVkLiAgRG8gbm90IGRvIHRoaXMgb24gaW5pdGlhbCBwYWdlIGxvYWRcbiAgICAvLyBiZWNhdXNlIHRoZSBzZWxlY3RlZCBmaWxlcyBwZXJzaXN0cyBpbiBmaXJlZm94IGFjcm9zcyByZWZyZXNoZXMsIGJ1dCB0aGUgdXNlciBtYXkgaGF2ZVxuICAgIC8vIHNlbGVjdGVkIGEgZGlmZmVyZW50IGl0ZW0gZnJvbSB0aGUgZHJvcGRvd25cbiAgICBpZiAoIWR1cmluZ1BhZ2VMb2FkKSB7XG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3Byb2ZpbGVJZCcsIHRoaXMucHJvZmlsZUlkKTtcbiAgICB9XG5cbiAgICAvLyBOb3RpZnkgdGhhdCB0aGUgbG9jYWwgcHJvZmlsZSBpcyByZWFkeSBmb3IgdXNlXG4gICAgY29uc3QgY2hhbmdlRXZlbnQgPSBuZXcgRXZlbnQoJ2xvY2FscHJvZmlsZWNoYW5nZScpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChjaGFuZ2VFdmVudCk7XG4gIH1cblxuICAvKipcbiAgICogQnVpbGQgYSBtZXJnZWQgcHJvZmlsZSBmaWxlIGZyb20gdGhlIHJlZ2lzdHJ5IHByb2ZpbGUgYW5kIGFzc2V0IG92ZXJyaWRlc1xuICAgKiBAcGFyYW0geyp9IHJlZ2lzdHJ5SnNvbkZpbGVcbiAgICogQHBhcmFtIHsqfSBhc3NldEpzb25GaWxlXG4gICAqL1xuICBhc3luYyBidWlsZFByb2ZpbGUocmVnaXN0cnlKc29uRmlsZSwgYXNzZXRKc29uRmlsZSkge1xuICAgIC8vIExvYWQgdGhlIHJlZ2lzdHJ5IEpTT04gYW5kIHZhbGlkYXRlIGl0IGFnYWluc3QgdGhlIHNjaGVtYVxuICAgIGNvbnN0IHJlZ2lzdHJ5SnNvbiA9IGF3YWl0IExvY2FsUHJvZmlsZS5sb2FkTG9jYWxKc29uKHJlZ2lzdHJ5SnNvbkZpbGUpO1xuICAgIGNvbnN0IGlzUmVnaXN0cnlKc29uVmFsaWQgPSB0aGlzLnJlZ2lzdHJ5U2NoZW1hVmFsaWRhdG9yKHJlZ2lzdHJ5SnNvbik7XG4gICAgaWYgKCFpc1JlZ2lzdHJ5SnNvblZhbGlkKSB7XG4gICAgICB0aHJvdyBuZXcgQXNzZXRFcnJvcihKU09OLnN0cmluZ2lmeSh0aGlzLnJlZ2lzdHJ5U2NoZW1hVmFsaWRhdG9yLmVycm9ycywgbnVsbCwgMikpO1xuICAgIH1cblxuICAgIC8vIExvYWQgdGhlIGFzc2V0IEpTT04gYW5kIHZhbGlkYXRlIGl0IGFnYWluc3QgdGhlIHNjaGVtYS5cbiAgICAvLyBJZiBubyBhc3NldCBKU09OIHByZXNlbnQsIHVzZSB0aGUgZGVmYXVsdCBkZWZpbml0b25cbiAgICBsZXQgYXNzZXRKc29uO1xuICAgIGlmICghYXNzZXRKc29uRmlsZSkge1xuICAgICAgYXNzZXRKc29uID0geyBwcm9maWxlSWQ6IHJlZ2lzdHJ5SnNvbi5wcm9maWxlSWQsIG92ZXJyaWRlczoge30gfTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXNzZXRKc29uID0gYXdhaXQgTG9jYWxQcm9maWxlLmxvYWRMb2NhbEpzb24oYXNzZXRKc29uRmlsZSk7XG4gICAgICBjb25zdCBpc0Fzc2V0SnNvblZhbGlkID0gdGhpcy5hc3NldFNjaGVtYVZhbGlkYXRvcihhc3NldEpzb24pO1xuICAgICAgaWYgKCFpc0Fzc2V0SnNvblZhbGlkKSB7XG4gICAgICAgIHRocm93IG5ldyBBc3NldEVycm9yKEpTT04uc3RyaW5naWZ5KHRoaXMuYXNzZXRTY2hlbWFWYWxpZGF0b3IuZXJyb3JzLCBudWxsLCAyKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVmFsaWRhdGUgbm9uLXNjaGVtYSByZXF1aXJlbWVudHMgYW5kIGJ1aWxkIGEgY29tYmluZWQgcHJvZmlsZVxuICAgIHZhbGlkYXRlUmVnaXN0cnlQcm9maWxlKHJlZ2lzdHJ5SnNvbik7XG4gICAgY29uc3QgZXhwYW5kZWRSZWdpc3RyeVByb2ZpbGUgPSBleHBhbmRSZWdpc3RyeVByb2ZpbGUocmVnaXN0cnlKc29uKTtcbiAgICB0aGlzLnByb2ZpbGUgPSBidWlsZEFzc2V0UHJvZmlsZShhc3NldEpzb24sIGV4cGFuZGVkUmVnaXN0cnlQcm9maWxlKTtcbiAgICB0aGlzLnByb2ZpbGVJZCA9IHRoaXMucHJvZmlsZS5wcm9maWxlSWQ7XG4gIH1cblxuICAvKipcbiAgICogSGVscGVyIHRvIGxvYWQgSlNPTiBmcm9tIGEgbG9jYWwgZmlsZVxuICAgKiBAcGFyYW0ge0ZpbGV9IGpzb25GaWxlXG4gICAqL1xuICBzdGF0aWMgbG9hZExvY2FsSnNvbihqc29uRmlsZSkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuXG4gICAgICByZWFkZXIub25sb2FkID0gKCkgPT4ge1xuICAgICAgICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShyZWFkZXIucmVzdWx0KTtcbiAgICAgICAgcmVzb2x2ZShqc29uKTtcbiAgICAgIH07XG5cbiAgICAgIHJlYWRlci5vbmVycm9yID0gKCkgPT4ge1xuICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSBgVW5hYmxlIHRvIGxvYWQgSlNPTiBmcm9tICR7anNvbkZpbGUubmFtZX1gO1xuICAgICAgICBBc3NldEVycm9yLmxvZyhlcnJvck1lc3NhZ2UpO1xuICAgICAgICByZWplY3QoZXJyb3JNZXNzYWdlKTtcbiAgICAgIH07XG5cbiAgICAgIHJlYWRlci5yZWFkQXNUZXh0KGpzb25GaWxlKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBIZWxwZXIgdG8gbG9hZCB0aGUgY29tYmluZWQgc2NoZW1hIGZpbGUgYW5kIGNvbXBpbGUgYW4gQUpWIHZhbGlkYXRvclxuICAgKiBAcGFyYW0ge3N0cmluZ30gc2NoZW1hc1BhdGhcbiAgICovXG4gIHN0YXRpYyBhc3luYyBidWlsZFNjaGVtYVZhbGlkYXRvcihzY2hlbWFzUGF0aCkge1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goc2NoZW1hc1BhdGgpO1xuICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgIHRocm93IG5ldyBBc3NldEVycm9yKHJlc3BvbnNlLnN0YXR1c1RleHQpO1xuICAgIH1cblxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby11bmRlZlxuICAgIGNvbnN0IGFqdiA9IG5ldyBBanYoKTtcbiAgICBjb25zdCBzY2hlbWFzID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgIHNjaGVtYXMuZGVwZW5kZW5jaWVzLmZvckVhY2goKHNjaGVtYSkgPT4ge1xuICAgICAgYWp2LmFkZFNjaGVtYShzY2hlbWEpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGFqdi5jb21waWxlKHNjaGVtYXMubWFpblNjaGVtYSk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgTG9jYWxQcm9maWxlO1xuIiwiLyogZXNsaW50LWRpc2FibGUgaW1wb3J0L25vLXVucmVzb2x2ZWQgKi9cbmltcG9ydCB7IGZldGNoUHJvZmlsZSwgZmV0Y2hQcm9maWxlc0xpc3QsIE1vdGlvbkNvbnRyb2xsZXIgfSBmcm9tICcuL21vdGlvbi1jb250cm9sbGVycy5qcyc7XG4vKiBlc2xpbnQtZW5hYmxlICovXG5cbmltcG9ydCBBc3NldEVycm9yIGZyb20gJy4vYXNzZXRFcnJvci5qcyc7XG5pbXBvcnQgTG9jYWxQcm9maWxlIGZyb20gJy4vbG9jYWxQcm9maWxlLmpzJztcblxuY29uc3QgcHJvZmlsZXNCYXNlUGF0aCA9ICcuL3Byb2ZpbGVzJztcblxuLyoqXG4gKiBMb2FkcyBwcm9maWxlcyBmcm9tIHRoZSBkaXN0cmlidXRpb24gZm9sZGVyIG5leHQgdG8gdGhlIHZpZXdlcidzIGxvY2F0aW9uXG4gKi9cbmNsYXNzIFByb2ZpbGVTZWxlY3RvciBleHRlbmRzIEV2ZW50VGFyZ2V0IHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoKTtcblxuICAgIC8vIEdldCB0aGUgcHJvZmlsZSBpZCBzZWxlY3RvciBhbmQgbGlzdGVuIGZvciBjaGFuZ2VzXG4gICAgdGhpcy5wcm9maWxlSWRTZWxlY3RvckVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJvZmlsZUlkU2VsZWN0b3InKTtcbiAgICB0aGlzLnByb2ZpbGVJZFNlbGVjdG9yRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoKSA9PiB7IHRoaXMub25Qcm9maWxlSWRDaGFuZ2UoKTsgfSk7XG5cbiAgICAvLyBHZXQgdGhlIGhhbmRlZG5lc3Mgc2VsZWN0b3IgYW5kIGxpc3RlbiBmb3IgY2hhbmdlc1xuICAgIHRoaXMuaGFuZGVkbmVzc1NlbGVjdG9yRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdoYW5kZWRuZXNzU2VsZWN0b3InKTtcbiAgICB0aGlzLmhhbmRlZG5lc3NTZWxlY3RvckVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgKCkgPT4geyB0aGlzLm9uSGFuZGVkbmVzc0NoYW5nZSgpOyB9KTtcblxuICAgIHRoaXMuZm9yY2VWUlByb2ZpbGVFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZvcmNlVlJQcm9maWxlJyk7XG4gICAgdGhpcy5zaG93VGFyZ2V0UmF5RWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzaG93VGFyZ2V0UmF5Jyk7XG5cbiAgICB0aGlzLmxvY2FsUHJvZmlsZSA9IG5ldyBMb2NhbFByb2ZpbGUoKTtcbiAgICB0aGlzLmxvY2FsUHJvZmlsZS5hZGRFdmVudExpc3RlbmVyKCdsb2NhbHByb2ZpbGVjaGFuZ2UnLCAoZXZlbnQpID0+IHsgdGhpcy5vbkxvY2FsUHJvZmlsZUNoYW5nZShldmVudCk7IH0pO1xuXG4gICAgdGhpcy5wcm9maWxlc0xpc3QgPSBudWxsO1xuICAgIHRoaXMucG9wdWxhdGVQcm9maWxlU2VsZWN0b3IoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNldHMgYWxsIHNlbGVjdGVkIHByb2ZpbGUgc3RhdGVcbiAgICovXG4gIGNsZWFyU2VsZWN0ZWRQcm9maWxlKCkge1xuICAgIEFzc2V0RXJyb3IuY2xlYXJBbGwoKTtcbiAgICB0aGlzLnByb2ZpbGUgPSBudWxsO1xuICAgIHRoaXMuaGFuZGVkbmVzcyA9IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmVzIHRoZSBmdWxsIGxpc3Qgb2YgYXZhaWxhYmxlIHByb2ZpbGVzIGFuZCBwb3B1bGF0ZXMgdGhlIGRyb3Bkb3duXG4gICAqL1xuICBhc3luYyBwb3B1bGF0ZVByb2ZpbGVTZWxlY3RvcigpIHtcbiAgICB0aGlzLmNsZWFyU2VsZWN0ZWRQcm9maWxlKCk7XG4gICAgdGhpcy5oYW5kZWRuZXNzU2VsZWN0b3JFbGVtZW50LmlubmVySFRNTCA9ICcnO1xuXG4gICAgLy8gTG9hZCBhbmQgY2xlYXIgbG9jYWwgc3RvcmFnZVxuICAgIGNvbnN0IHN0b3JlZFByb2ZpbGVJZCA9IHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncHJvZmlsZUlkJyk7XG4gICAgd2luZG93LmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdwcm9maWxlSWQnKTtcblxuICAgIC8vIExvYWQgdGhlIGxpc3Qgb2YgcHJvZmlsZXNcbiAgICBpZiAoIXRoaXMucHJvZmlsZXNMaXN0KSB7XG4gICAgICB0cnkge1xuICAgICAgICB0aGlzLnByb2ZpbGVJZFNlbGVjdG9yRWxlbWVudC5pbm5lckhUTUwgPSAnPG9wdGlvbiB2YWx1ZT1cImxvYWRpbmdcIj5Mb2FkaW5nLi4uPC9vcHRpb24+JztcbiAgICAgICAgdGhpcy5wcm9maWxlc0xpc3QgPSBhd2FpdCBmZXRjaFByb2ZpbGVzTGlzdChwcm9maWxlc0Jhc2VQYXRoKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHRoaXMucHJvZmlsZUlkU2VsZWN0b3JFbGVtZW50LmlubmVySFRNTCA9ICdGYWlsZWQgdG8gbG9hZCBsaXN0JztcbiAgICAgICAgQXNzZXRFcnJvci5sb2coZXJyb3IubWVzc2FnZSk7XG4gICAgICAgIHRocm93IGVycm9yO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFkZCBlYWNoIHByb2ZpbGUgdG8gdGhlIGRyb3Bkb3duXG4gICAgdGhpcy5wcm9maWxlSWRTZWxlY3RvckVsZW1lbnQuaW5uZXJIVE1MID0gJyc7XG4gICAgT2JqZWN0LmtleXModGhpcy5wcm9maWxlc0xpc3QpLmZvckVhY2goKHByb2ZpbGVJZCkgPT4ge1xuICAgICAgY29uc3QgcHJvZmlsZSA9IHRoaXMucHJvZmlsZXNMaXN0W3Byb2ZpbGVJZF07XG4gICAgICBpZiAoIXByb2ZpbGUuZGVwcmVjYXRlZCkge1xuICAgICAgICB0aGlzLnByb2ZpbGVJZFNlbGVjdG9yRWxlbWVudC5pbm5lckhUTUwgKz0gYFxuICAgICAgICA8b3B0aW9uIHZhbHVlPScke3Byb2ZpbGVJZH0nPiR7cHJvZmlsZUlkfTwvb3B0aW9uPlxuICAgICAgICBgO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gQWRkIHRoZSBsb2NhbCBwcm9maWxlIGlmIGl0IGlzbid0IGFscmVhZHkgaW5jbHVkZWRcbiAgICBpZiAodGhpcy5sb2NhbFByb2ZpbGUucHJvZmlsZUlkXG4gICAgICYmICFPYmplY3Qua2V5cyh0aGlzLnByb2ZpbGVzTGlzdCkuaW5jbHVkZXModGhpcy5sb2NhbFByb2ZpbGUucHJvZmlsZUlkKSkge1xuICAgICAgdGhpcy5wcm9maWxlSWRTZWxlY3RvckVsZW1lbnQuaW5uZXJIVE1MICs9IGBcbiAgICAgIDxvcHRpb24gdmFsdWU9JyR7dGhpcy5sb2NhbFByb2ZpbGUucHJvZmlsZUlkfSc+JHt0aGlzLmxvY2FsUHJvZmlsZS5wcm9maWxlSWR9PC9vcHRpb24+XG4gICAgICBgO1xuICAgICAgdGhpcy5wcm9maWxlc0xpc3RbdGhpcy5sb2NhbFByb2ZpbGUucHJvZmlsZUlkXSA9IHRoaXMubG9jYWxQcm9maWxlO1xuICAgIH1cblxuICAgIC8vIE92ZXJyaWRlIHRoZSBkZWZhdWx0IHNlbGVjdGlvbiBpZiB2YWx1ZXMgd2VyZSBwcmVzZW50IGluIGxvY2FsIHN0b3JhZ2VcbiAgICBpZiAoc3RvcmVkUHJvZmlsZUlkKSB7XG4gICAgICB0aGlzLnByb2ZpbGVJZFNlbGVjdG9yRWxlbWVudC52YWx1ZSA9IHN0b3JlZFByb2ZpbGVJZDtcbiAgICB9XG5cbiAgICAvLyBNYW51YWxseSB0cmlnZ2VyIHNlbGVjdGVkIHByb2ZpbGUgdG8gbG9hZFxuICAgIHRoaXMub25Qcm9maWxlSWRDaGFuZ2UoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBIYW5kbGVyIGZvciB0aGUgcHJvZmlsZSBpZCBzZWxlY3Rpb24gY2hhbmdlXG4gICAqL1xuICBvblByb2ZpbGVJZENoYW5nZSgpIHtcbiAgICB0aGlzLmNsZWFyU2VsZWN0ZWRQcm9maWxlKCk7XG4gICAgdGhpcy5oYW5kZWRuZXNzU2VsZWN0b3JFbGVtZW50LmlubmVySFRNTCA9ICcnO1xuXG4gICAgY29uc3QgcHJvZmlsZUlkID0gdGhpcy5wcm9maWxlSWRTZWxlY3RvckVsZW1lbnQudmFsdWU7XG4gICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKCdwcm9maWxlSWQnLCBwcm9maWxlSWQpO1xuXG4gICAgaWYgKHByb2ZpbGVJZCA9PT0gdGhpcy5sb2NhbFByb2ZpbGUucHJvZmlsZUlkKSB7XG4gICAgICB0aGlzLnByb2ZpbGUgPSB0aGlzLmxvY2FsUHJvZmlsZS5wcm9maWxlO1xuICAgICAgdGhpcy5wb3B1bGF0ZUhhbmRlZG5lc3NTZWxlY3RvcigpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBBdHRlbXB0IHRvIGxvYWQgdGhlIHByb2ZpbGVcbiAgICAgIHRoaXMucHJvZmlsZUlkU2VsZWN0b3JFbGVtZW50LmRpc2FibGVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuaGFuZGVkbmVzc1NlbGVjdG9yRWxlbWVudC5kaXNhYmxlZCA9IHRydWU7XG4gICAgICBmZXRjaFByb2ZpbGUoeyBwcm9maWxlczogW3Byb2ZpbGVJZF0sIGhhbmRlZG5lc3M6ICdhbnknIH0sIHByb2ZpbGVzQmFzZVBhdGgsIG51bGwsIGZhbHNlKS50aGVuKCh7IHByb2ZpbGUgfSkgPT4ge1xuICAgICAgICB0aGlzLnByb2ZpbGUgPSBwcm9maWxlO1xuICAgICAgICB0aGlzLnBvcHVsYXRlSGFuZGVkbmVzc1NlbGVjdG9yKCk7XG4gICAgICB9KVxuICAgICAgICAuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICAgICAgQXNzZXRFcnJvci5sb2coZXJyb3IubWVzc2FnZSk7XG4gICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH0pXG4gICAgICAgIC5maW5hbGx5KCgpID0+IHtcbiAgICAgICAgICB0aGlzLnByb2ZpbGVJZFNlbGVjdG9yRWxlbWVudC5kaXNhYmxlZCA9IGZhbHNlO1xuICAgICAgICAgIHRoaXMuaGFuZGVkbmVzc1NlbGVjdG9yRWxlbWVudC5kaXNhYmxlZCA9IGZhbHNlO1xuICAgICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUG9wdWxhdGVzIHRoZSBoYW5kZWRuZXNzIGRyb3Bkb3duIHdpdGggdGhvc2Ugc3VwcG9ydGVkIGJ5IHRoZSBzZWxlY3RlZCBwcm9maWxlXG4gICAqL1xuICBwb3B1bGF0ZUhhbmRlZG5lc3NTZWxlY3RvcigpIHtcbiAgICAvLyBMb2FkIGFuZCBjbGVhciB0aGUgbGFzdCBzZWxlY3Rpb24gZm9yIHRoaXMgcHJvZmlsZSBpZFxuICAgIGNvbnN0IHN0b3JlZEhhbmRlZG5lc3MgPSB3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2hhbmRlZG5lc3MnKTtcbiAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ2hhbmRlZG5lc3MnKTtcblxuICAgIC8vIFBvcHVsYXRlIGhhbmRlZG5lc3Mgc2VsZWN0b3JcbiAgICBPYmplY3Qua2V5cyh0aGlzLnByb2ZpbGUubGF5b3V0cykuZm9yRWFjaCgoaGFuZGVkbmVzcykgPT4ge1xuICAgICAgdGhpcy5oYW5kZWRuZXNzU2VsZWN0b3JFbGVtZW50LmlubmVySFRNTCArPSBgXG4gICAgICAgIDxvcHRpb24gdmFsdWU9JyR7aGFuZGVkbmVzc30nPiR7aGFuZGVkbmVzc308L29wdGlvbj5cbiAgICAgIGA7XG4gICAgfSk7XG5cbiAgICAvLyBBcHBseSBzdG9yZWQgaGFuZGVkbmVzcyBpZiBmb3VuZFxuICAgIGlmIChzdG9yZWRIYW5kZWRuZXNzICYmIHRoaXMucHJvZmlsZS5sYXlvdXRzW3N0b3JlZEhhbmRlZG5lc3NdKSB7XG4gICAgICB0aGlzLmhhbmRlZG5lc3NTZWxlY3RvckVsZW1lbnQudmFsdWUgPSBzdG9yZWRIYW5kZWRuZXNzO1xuICAgIH1cblxuICAgIC8vIE1hbnVhbGx5IHRyaWdnZXIgc2VsZWN0ZWQgaGFuZGVkbmVzcyBjaGFuZ2VcbiAgICB0aGlzLm9uSGFuZGVkbmVzc0NoYW5nZSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlc3BvbmRzIHRvIGNoYW5nZXMgaW4gc2VsZWN0ZWQgaGFuZGVkbmVzcy5cbiAgICogQ3JlYXRlcyBhIG5ldyBtb3Rpb24gY29udHJvbGxlciBmb3IgdGhlIGNvbWJpbmF0aW9uIG9mIHByb2ZpbGUgYW5kIGhhbmRlZG5lc3MsIGFuZCBmaXJlcyBhblxuICAgKiBldmVudCB0byBzaWduYWwgdGhlIGNoYW5nZVxuICAgKi9cbiAgb25IYW5kZWRuZXNzQ2hhbmdlKCkge1xuICAgIEFzc2V0RXJyb3IuY2xlYXJBbGwoKTtcbiAgICB0aGlzLmhhbmRlZG5lc3MgPSB0aGlzLmhhbmRlZG5lc3NTZWxlY3RvckVsZW1lbnQudmFsdWU7XG4gICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKCdoYW5kZWRuZXNzJywgdGhpcy5oYW5kZWRuZXNzKTtcbiAgICBpZiAodGhpcy5oYW5kZWRuZXNzKSB7XG4gICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdzZWxlY3Rpb25jaGFuZ2UnKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ3NlbGVjdGlvbmNsZWFyJykpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIHRoZSBwcm9maWxlcyBkcm9wZG93biB0byBlbnN1cmUgbG9jYWwgcHJvZmlsZSBpcyBpbiB0aGUgbGlzdFxuICAgKi9cbiAgb25Mb2NhbFByb2ZpbGVDaGFuZ2UoKSB7XG4gICAgdGhpcy5wb3B1bGF0ZVByb2ZpbGVTZWxlY3RvcigpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluZGljYXRlcyBpZiB0aGUgY3VycmVudGx5IHNlbGVjdGVkIHByb2ZpbGUgc2hvdWxkIGJlIHNob3duIGluIFZSIGluc3RlYWRcbiAgICogb2YgdGhlIHByb2ZpbGVzIGFkdmVydGlzZWQgYnkgdGhlIHJlYWwgWFJJbnB1dFNvdXJjZS5cbiAgICovXG4gIGdldCBmb3JjZVZSUHJvZmlsZSgpIHtcbiAgICByZXR1cm4gdGhpcy5mb3JjZVZSUHJvZmlsZUVsZW1lbnQuY2hlY2tlZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbmRpY2F0ZXMgaWYgdGhlIHRhcmdldFJheVNwYWNlIGZvciBhbiBpbnB1dCBzb3VyY2Ugc2hvdWxkIGJlIHZpc3VhbGl6ZWQgaW5cbiAgICogVlIuXG4gICAqL1xuICBnZXQgc2hvd1RhcmdldFJheSgpIHtcbiAgICByZXR1cm4gdGhpcy5zaG93VGFyZ2V0UmF5RWxlbWVudC5jaGVja2VkO1xuICB9XG5cbiAgLyoqXG4gICAqIEJ1aWxkcyBhIE1vdGlvbkNvbnRyb2xsZXIgZWl0aGVyIGJhc2VkIG9uIHRoZSBzdXBwbGllZCBpbnB1dCBzb3VyY2UgdXNpbmcgdGhlIGxvY2FsIHByb2ZpbGVcbiAgICogaWYgaXQgaXMgdGhlIGJlc3QgbWF0Y2gsIG90aGVyd2lzZSB1c2VzIHRoZSByZW1vdGUgYXNzZXRzXG4gICAqIEBwYXJhbSB7WFJJbnB1dFNvdXJjZX0geHJJbnB1dFNvdXJjZVxuICAgKi9cbiAgYXN5bmMgY3JlYXRlTW90aW9uQ29udHJvbGxlcih4cklucHV0U291cmNlKSB7XG4gICAgbGV0IHByb2ZpbGU7XG4gICAgbGV0IGFzc2V0UGF0aDtcblxuICAgIC8vIENoZWNrIGlmIGxvY2FsIG92ZXJyaWRlIHNob3VsZCBiZSB1c2VkXG4gICAgbGV0IHVzZUxvY2FsUHJvZmlsZSA9IGZhbHNlO1xuICAgIGlmICh0aGlzLmxvY2FsUHJvZmlsZS5wcm9maWxlSWQpIHtcbiAgICAgIHhySW5wdXRTb3VyY2UucHJvZmlsZXMuc29tZSgocHJvZmlsZUlkKSA9PiB7XG4gICAgICAgIGNvbnN0IG1hdGNoRm91bmQgPSBPYmplY3Qua2V5cyh0aGlzLnByb2ZpbGVzTGlzdCkuaW5jbHVkZXMocHJvZmlsZUlkKTtcbiAgICAgICAgdXNlTG9jYWxQcm9maWxlID0gbWF0Y2hGb3VuZCAmJiAocHJvZmlsZUlkID09PSB0aGlzLmxvY2FsUHJvZmlsZS5wcm9maWxlSWQpO1xuICAgICAgICByZXR1cm4gbWF0Y2hGb3VuZDtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEdldCBwcm9maWxlIGFuZCBhc3NldCBwYXRoXG4gICAgaWYgKHVzZUxvY2FsUHJvZmlsZSkge1xuICAgICAgKHsgcHJvZmlsZSB9ID0gdGhpcy5sb2NhbFByb2ZpbGUpO1xuICAgICAgY29uc3QgYXNzZXROYW1lID0gdGhpcy5sb2NhbFByb2ZpbGUucHJvZmlsZS5sYXlvdXRzW3hySW5wdXRTb3VyY2UuaGFuZGVkbmVzc10uYXNzZXRQYXRoO1xuICAgICAgYXNzZXRQYXRoID0gdGhpcy5sb2NhbFByb2ZpbGUuYXNzZXRzW2Fzc2V0TmFtZV0gfHwgYXNzZXROYW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICAoeyBwcm9maWxlLCBhc3NldFBhdGggfSA9IGF3YWl0IGZldGNoUHJvZmlsZSh4cklucHV0U291cmNlLCBwcm9maWxlc0Jhc2VQYXRoKSk7XG4gICAgfVxuXG4gICAgLy8gQnVpbGQgbW90aW9uIGNvbnRyb2xsZXJcbiAgICBjb25zdCBtb3Rpb25Db250cm9sbGVyID0gbmV3IE1vdGlvbkNvbnRyb2xsZXIoXG4gICAgICB4cklucHV0U291cmNlLFxuICAgICAgcHJvZmlsZSxcbiAgICAgIGFzc2V0UGF0aFxuICAgICk7XG5cbiAgICByZXR1cm4gbW90aW9uQ29udHJvbGxlcjtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBQcm9maWxlU2VsZWN0b3I7XG4iLCJjb25zdCBkZWZhdWx0QmFja2dyb3VuZCA9ICdnZW9yZ2VudG9yJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQmFja2dyb3VuZFNlbGVjdG9yIGV4dGVuZHMgRXZlbnRUYXJnZXQge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcigpO1xuXG4gICAgdGhpcy5iYWNrZ3JvdW5kU2VsZWN0b3JFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhY2tncm91bmRTZWxlY3RvcicpO1xuICAgIHRoaXMuYmFja2dyb3VuZFNlbGVjdG9yRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoKSA9PiB7IHRoaXMub25CYWNrZ3JvdW5kQ2hhbmdlKCk7IH0pO1xuXG4gICAgdGhpcy5zZWxlY3RlZEJhY2tncm91bmQgPSB3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2JhY2tncm91bmQnKSB8fCBkZWZhdWx0QmFja2dyb3VuZDtcbiAgICB0aGlzLmJhY2tncm91bmRMaXN0ID0ge307XG4gICAgZmV0Y2goJ2JhY2tncm91bmRzL2JhY2tncm91bmRzLmpzb24nKVxuICAgICAgLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKVxuICAgICAgLnRoZW4oKGJhY2tncm91bmRzKSA9PiB7XG4gICAgICAgIHRoaXMuYmFja2dyb3VuZExpc3QgPSBiYWNrZ3JvdW5kcztcbiAgICAgICAgT2JqZWN0LmtleXMoYmFja2dyb3VuZHMpLmZvckVhY2goKGJhY2tncm91bmQpID0+IHtcbiAgICAgICAgICBjb25zdCBvcHRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdvcHRpb24nKTtcbiAgICAgICAgICBvcHRpb24udmFsdWUgPSBiYWNrZ3JvdW5kO1xuICAgICAgICAgIG9wdGlvbi5pbm5lclRleHQgPSBiYWNrZ3JvdW5kO1xuICAgICAgICAgIGlmICh0aGlzLnNlbGVjdGVkQmFja2dyb3VuZCA9PT0gYmFja2dyb3VuZCkge1xuICAgICAgICAgICAgb3B0aW9uLnNlbGVjdGVkID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5iYWNrZ3JvdW5kU2VsZWN0b3JFbGVtZW50LmFwcGVuZENoaWxkKG9wdGlvbik7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdzZWxlY3Rpb25jaGFuZ2UnKSk7XG4gICAgICB9KTtcbiAgfVxuXG4gIG9uQmFja2dyb3VuZENoYW5nZSgpIHtcbiAgICB0aGlzLnNlbGVjdGVkQmFja2dyb3VuZCA9IHRoaXMuYmFja2dyb3VuZFNlbGVjdG9yRWxlbWVudC52YWx1ZTtcbiAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2JhY2tncm91bmQnLCB0aGlzLnNlbGVjdGVkQmFja2dyb3VuZCk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnc2VsZWN0aW9uY2hhbmdlJykpO1xuICB9XG5cbiAgZ2V0IGJhY2tncm91bmRQYXRoKCkge1xuICAgIHJldHVybiB0aGlzLmJhY2tncm91bmRMaXN0W3RoaXMuc2VsZWN0ZWRCYWNrZ3JvdW5kXTtcbiAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGUgaW1wb3J0L25vLXVucmVzb2x2ZWQgKi9cbmltcG9ydCB7IENvbnN0YW50cyB9IGZyb20gJy4uL21vdGlvbi1jb250cm9sbGVycy5qcyc7XG4vKiBlc2xpbnQtZW5hYmxlICovXG5cbi8qKlxuICogQSBmYWxzZSBnYW1lcGFkIHRvIGJlIHVzZWQgaW4gdGVzdHNcbiAqL1xuY2xhc3MgTW9ja0dhbWVwYWQge1xuICAvKipcbiAgICogQHBhcmFtIHtPYmplY3R9IHByb2ZpbGVEZXNjcmlwdGlvbiAtIFRoZSBwcm9maWxlIGRlc2NyaXB0aW9uIHRvIHBhcnNlIHRvIGRldGVybWluZSB0aGUgbGVuZ3RoXG4gICAqIG9mIHRoZSBidXR0b24gYW5kIGF4ZXMgYXJyYXlzXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBoYW5kZWRuZXNzIC0gVGhlIGdhbWVwYWQncyBoYW5kZWRuZXNzXG4gICAqL1xuICBjb25zdHJ1Y3Rvcihwcm9maWxlRGVzY3JpcHRpb24sIGhhbmRlZG5lc3MpIHtcbiAgICBpZiAoIXByb2ZpbGVEZXNjcmlwdGlvbikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBwcm9maWxlRGVzY3JpcHRpb24gc3VwcGxpZWQnKTtcbiAgICB9XG5cbiAgICBpZiAoIWhhbmRlZG5lc3MpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTm8gaGFuZGVkbmVzcyBzdXBwbGllZCcpO1xuICAgIH1cblxuICAgIHRoaXMuaWQgPSBwcm9maWxlRGVzY3JpcHRpb24ucHJvZmlsZUlkO1xuXG4gICAgLy8gTG9vcCB0aHJvdWdoIHRoZSBwcm9maWxlIGRlc2NyaXB0aW9uIHRvIGRldGVybWluZSBob3cgbWFueSBlbGVtZW50cyB0byBwdXQgaW4gdGhlIGJ1dHRvbnNcbiAgICAvLyBhbmQgYXhlcyBhcnJheXNcbiAgICBsZXQgbWF4QnV0dG9uSW5kZXggPSAwO1xuICAgIGxldCBtYXhBeGlzSW5kZXggPSAwO1xuICAgIGNvbnN0IGxheW91dCA9IHByb2ZpbGVEZXNjcmlwdGlvbi5sYXlvdXRzW2hhbmRlZG5lc3NdO1xuICAgIHRoaXMubWFwcGluZyA9IGxheW91dC5tYXBwaW5nO1xuICAgIE9iamVjdC52YWx1ZXMobGF5b3V0LmNvbXBvbmVudHMpLmZvckVhY2goKHsgZ2FtZXBhZEluZGljZXMgfSkgPT4ge1xuICAgICAgY29uc3Qge1xuICAgICAgICBbQ29uc3RhbnRzLkNvbXBvbmVudFByb3BlcnR5LkJVVFRPTl06IGJ1dHRvbkluZGV4LFxuICAgICAgICBbQ29uc3RhbnRzLkNvbXBvbmVudFByb3BlcnR5LlhfQVhJU106IHhBeGlzSW5kZXgsXG4gICAgICAgIFtDb25zdGFudHMuQ29tcG9uZW50UHJvcGVydHkuWV9BWElTXTogeUF4aXNJbmRleFxuICAgICAgfSA9IGdhbWVwYWRJbmRpY2VzO1xuXG4gICAgICBpZiAoYnV0dG9uSW5kZXggIT09IHVuZGVmaW5lZCAmJiBidXR0b25JbmRleCA+IG1heEJ1dHRvbkluZGV4KSB7XG4gICAgICAgIG1heEJ1dHRvbkluZGV4ID0gYnV0dG9uSW5kZXg7XG4gICAgICB9XG5cbiAgICAgIGlmICh4QXhpc0luZGV4ICE9PSB1bmRlZmluZWQgJiYgKHhBeGlzSW5kZXggPiBtYXhBeGlzSW5kZXgpKSB7XG4gICAgICAgIG1heEF4aXNJbmRleCA9IHhBeGlzSW5kZXg7XG4gICAgICB9XG5cbiAgICAgIGlmICh5QXhpc0luZGV4ICE9PSB1bmRlZmluZWQgJiYgKHlBeGlzSW5kZXggPiBtYXhBeGlzSW5kZXgpKSB7XG4gICAgICAgIG1heEF4aXNJbmRleCA9IHlBeGlzSW5kZXg7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBGaWxsIHRoZSBheGVzIGFycmF5XG4gICAgdGhpcy5heGVzID0gW107XG4gICAgd2hpbGUgKHRoaXMuYXhlcy5sZW5ndGggPD0gbWF4QXhpc0luZGV4KSB7XG4gICAgICB0aGlzLmF4ZXMucHVzaCgwKTtcbiAgICB9XG5cbiAgICAvLyBGaWxsIHRoZSBidXR0b25zIGFycmF5XG4gICAgdGhpcy5idXR0b25zID0gW107XG4gICAgd2hpbGUgKHRoaXMuYnV0dG9ucy5sZW5ndGggPD0gbWF4QnV0dG9uSW5kZXgpIHtcbiAgICAgIHRoaXMuYnV0dG9ucy5wdXNoKHtcbiAgICAgICAgdmFsdWU6IDAsXG4gICAgICAgIHRvdWNoZWQ6IGZhbHNlLFxuICAgICAgICBwcmVzc2VkOiBmYWxzZVxuICAgICAgfSk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IE1vY2tHYW1lcGFkO1xuIiwiLyoqXG4gKiBBIGZha2UgWFJJbnB1dFNvdXJjZSB0aGF0IGNhbiBiZSB1c2VkIHRvIGluaXRpYWxpemUgYSBNb3Rpb25Db250cm9sbGVyXG4gKi9cbmNsYXNzIE1vY2tYUklucHV0U291cmNlIHtcbiAgLyoqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBnYW1lcGFkIC0gVGhlIEdhbWVwYWQgb2JqZWN0IHRoYXQgcHJvdmlkZXMgdGhlIGJ1dHRvbiBhbmQgYXhpcyBkYXRhXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBoYW5kZWRuZXNzIC0gVGhlIGhhbmRlZG5lc3MgdG8gcmVwb3J0XG4gICAqL1xuICBjb25zdHJ1Y3Rvcihwcm9maWxlcywgZ2FtZXBhZCwgaGFuZGVkbmVzcykge1xuICAgIHRoaXMuZ2FtZXBhZCA9IGdhbWVwYWQ7XG5cbiAgICBpZiAoIWhhbmRlZG5lc3MpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTm8gaGFuZGVkbmVzcyBzdXBwbGllZCcpO1xuICAgIH1cblxuICAgIHRoaXMuaGFuZGVkbmVzcyA9IGhhbmRlZG5lc3M7XG4gICAgdGhpcy5wcm9maWxlcyA9IE9iamVjdC5mcmVlemUocHJvZmlsZXMpO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IE1vY2tYUklucHV0U291cmNlO1xuIiwiLyogZXNsaW50LWRpc2FibGUgaW1wb3J0L25vLXVucmVzb2x2ZWQgKi9cbmltcG9ydCAqIGFzIFRIUkVFIGZyb20gJy4vdGhyZWUvYnVpbGQvdGhyZWUubW9kdWxlLmpzJztcbmltcG9ydCB7IE9yYml0Q29udHJvbHMgfSBmcm9tICcuL3RocmVlL2V4YW1wbGVzL2pzbS9jb250cm9scy9PcmJpdENvbnRyb2xzLmpzJztcbmltcG9ydCB7IFJHQkVMb2FkZXIgfSBmcm9tICcuL3RocmVlL2V4YW1wbGVzL2pzbS9sb2FkZXJzL1JHQkVMb2FkZXIuanMnO1xuaW1wb3J0IHsgVlJCdXR0b24gfSBmcm9tICcuL3RocmVlL2V4YW1wbGVzL2pzbS93ZWJ4ci9WUkJ1dHRvbi5qcyc7XG4vKiBlc2xpbnQtZW5hYmxlICovXG5cbmltcG9ydCBNYW51YWxDb250cm9scyBmcm9tICcuL21hbnVhbENvbnRyb2xzLmpzJztcbmltcG9ydCBDb250cm9sbGVyTW9kZWwgZnJvbSAnLi9jb250cm9sbGVyTW9kZWwuanMnO1xuaW1wb3J0IFByb2ZpbGVTZWxlY3RvciBmcm9tICcuL3Byb2ZpbGVTZWxlY3Rvci5qcyc7XG5pbXBvcnQgQmFja2dyb3VuZFNlbGVjdG9yIGZyb20gJy4vYmFja2dyb3VuZFNlbGVjdG9yLmpzJztcbmltcG9ydCBBc3NldEVycm9yIGZyb20gJy4vYXNzZXRFcnJvci5qcyc7XG5pbXBvcnQgTW9ja0dhbWVwYWQgZnJvbSAnLi9tb2Nrcy9tb2NrR2FtZXBhZC5qcyc7XG5pbXBvcnQgTW9ja1hSSW5wdXRTb3VyY2UgZnJvbSAnLi9tb2Nrcy9tb2NrWFJJbnB1dFNvdXJjZS5qcyc7XG5cbmNvbnN0IHRocmVlID0ge307XG5sZXQgY2FudmFzUGFyZW50RWxlbWVudDtcbmxldCB2clByb2ZpbGVzRWxlbWVudDtcbmxldCB2clByb2ZpbGVzTGlzdEVsZW1lbnQ7XG5cbmxldCBwcm9maWxlU2VsZWN0b3I7XG5sZXQgYmFja2dyb3VuZFNlbGVjdG9yO1xubGV0IG1vY2tDb250cm9sbGVyTW9kZWw7XG5sZXQgaXNJbW1lcnNpdmUgPSBmYWxzZTtcblxuLyoqXG4gKiBBZGRzIHRoZSBldmVudCBoYW5kbGVycyBmb3IgVlIgbW90aW9uIGNvbnRyb2xsZXJzIHRvIGxvYWQgdGhlIGFzc2V0cyBvbiBjb25uZWN0aW9uXG4gKiBhbmQgcmVtb3ZlIHRoZW0gb24gZGlzY29ubmVjdGlvblxuICogQHBhcmFtIHtudW1iZXJ9IGluZGV4XG4gKi9cbmZ1bmN0aW9uIGluaXRpYWxpemVWUkNvbnRyb2xsZXIoaW5kZXgpIHtcbiAgY29uc3QgdnJDb250cm9sbGVyR3JpcCA9IHRocmVlLnJlbmRlcmVyLnhyLmdldENvbnRyb2xsZXJHcmlwKGluZGV4KTtcblxuICB2ckNvbnRyb2xsZXJHcmlwLmFkZEV2ZW50TGlzdGVuZXIoJ2Nvbm5lY3RlZCcsIGFzeW5jIChldmVudCkgPT4ge1xuICAgIGNvbnN0IGNvbnRyb2xsZXJNb2RlbCA9IG5ldyBDb250cm9sbGVyTW9kZWwoKTtcbiAgICB2ckNvbnRyb2xsZXJHcmlwLmFkZChjb250cm9sbGVyTW9kZWwpO1xuXG4gICAgbGV0IHhySW5wdXRTb3VyY2UgPSBldmVudC5kYXRhO1xuXG4gICAgdnJQcm9maWxlc0xpc3RFbGVtZW50LmlubmVySFRNTCArPSBgPGxpPjxiPiR7eHJJbnB1dFNvdXJjZS5oYW5kZWRuZXNzfTo8L2I+IFske3hySW5wdXRTb3VyY2UucHJvZmlsZXN9XTwvbGk+YDtcblxuICAgIGlmIChwcm9maWxlU2VsZWN0b3IuZm9yY2VWUlByb2ZpbGUpIHtcbiAgICAgIHhySW5wdXRTb3VyY2UgPSBuZXcgTW9ja1hSSW5wdXRTb3VyY2UoXG4gICAgICAgIFtwcm9maWxlU2VsZWN0b3IucHJvZmlsZS5wcm9maWxlSWRdLCBldmVudC5kYXRhLmdhbWVwYWQsIGV2ZW50LmRhdGEuaGFuZGVkbmVzc1xuICAgICAgKTtcbiAgICB9XG5cbiAgICBjb25zdCBtb3Rpb25Db250cm9sbGVyID0gYXdhaXQgcHJvZmlsZVNlbGVjdG9yLmNyZWF0ZU1vdGlvbkNvbnRyb2xsZXIoeHJJbnB1dFNvdXJjZSk7XG4gICAgYXdhaXQgY29udHJvbGxlck1vZGVsLmluaXRpYWxpemUobW90aW9uQ29udHJvbGxlcik7XG5cbiAgICBpZiAodGhyZWUuZW52aXJvbm1lbnRNYXApIHtcbiAgICAgIGNvbnRyb2xsZXJNb2RlbC5lbnZpcm9ubWVudE1hcCA9IHRocmVlLmVudmlyb25tZW50TWFwO1xuICAgIH1cbiAgfSk7XG5cbiAgdnJDb250cm9sbGVyR3JpcC5hZGRFdmVudExpc3RlbmVyKCdkaXNjb25uZWN0ZWQnLCAoKSA9PiB7XG4gICAgdnJDb250cm9sbGVyR3JpcC5yZW1vdmUodnJDb250cm9sbGVyR3JpcC5jaGlsZHJlblswXSk7XG4gIH0pO1xuXG4gIHRocmVlLnNjZW5lLmFkZCh2ckNvbnRyb2xsZXJHcmlwKTtcblxuICBjb25zdCB2ckNvbnRyb2xsZXJUYXJnZXQgPSB0aHJlZS5yZW5kZXJlci54ci5nZXRDb250cm9sbGVyKGluZGV4KTtcblxuICB2ckNvbnRyb2xsZXJUYXJnZXQuYWRkRXZlbnRMaXN0ZW5lcignY29ubmVjdGVkJywgKCkgPT4ge1xuICAgIGlmIChwcm9maWxlU2VsZWN0b3Iuc2hvd1RhcmdldFJheSkge1xuICAgICAgY29uc3QgZ2VvbWV0cnkgPSBuZXcgVEhSRUUuQnVmZmVyR2VvbWV0cnkoKTtcbiAgICAgIGdlb21ldHJ5LnNldEF0dHJpYnV0ZSgncG9zaXRpb24nLCBuZXcgVEhSRUUuRmxvYXQzMkJ1ZmZlckF0dHJpYnV0ZShbMCwgMCwgMCwgMCwgMCwgLTFdLCAzKSk7XG4gICAgICBnZW9tZXRyeS5zZXRBdHRyaWJ1dGUoJ2NvbG9yJywgbmV3IFRIUkVFLkZsb2F0MzJCdWZmZXJBdHRyaWJ1dGUoWzAuNSwgMC41LCAwLjUsIDAsIDAsIDBdLCAzKSk7XG5cbiAgICAgIGNvbnN0IG1hdGVyaWFsID0gbmV3IFRIUkVFLkxpbmVCYXNpY01hdGVyaWFsKHtcbiAgICAgICAgdmVydGV4Q29sb3JzOiBUSFJFRS5WZXJ0ZXhDb2xvcnMsXG4gICAgICAgIGJsZW5kaW5nOiBUSFJFRS5BZGRpdGl2ZUJsZW5kaW5nXG4gICAgICB9KTtcblxuICAgICAgdnJDb250cm9sbGVyVGFyZ2V0LmFkZChuZXcgVEhSRUUuTGluZShnZW9tZXRyeSwgbWF0ZXJpYWwpKTtcbiAgICB9XG4gIH0pO1xuXG4gIHZyQ29udHJvbGxlclRhcmdldC5hZGRFdmVudExpc3RlbmVyKCdkaXNjb25uZWN0ZWQnLCAoKSA9PiB7XG4gICAgaWYgKHZyQ29udHJvbGxlclRhcmdldC5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgIHZyQ29udHJvbGxlclRhcmdldC5yZW1vdmUodnJDb250cm9sbGVyVGFyZ2V0LmNoaWxkcmVuWzBdKTtcbiAgICB9XG4gIH0pO1xuXG4gIHRocmVlLnNjZW5lLmFkZCh2ckNvbnRyb2xsZXJUYXJnZXQpO1xufVxuXG4vKipcbiAqIFRoZSB0aHJlZS5qcyByZW5kZXIgbG9vcCAodXNlZCBpbnN0ZWFkIG9mIHJlcXVlc3RBbmltYXRpb25GcmFtZSB0byBzdXBwb3J0IFhSKVxuICovXG5mdW5jdGlvbiByZW5kZXIoKSB7XG4gIGlmIChtb2NrQ29udHJvbGxlck1vZGVsKSB7XG4gICAgaWYgKGlzSW1tZXJzaXZlKSB7XG4gICAgICB0aHJlZS5zY2VuZS5yZW1vdmUobW9ja0NvbnRyb2xsZXJNb2RlbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocmVlLnNjZW5lLmFkZChtb2NrQ29udHJvbGxlck1vZGVsKTtcbiAgICAgIE1hbnVhbENvbnRyb2xzLnVwZGF0ZVRleHQoKTtcbiAgICB9XG4gIH1cblxuICB0aHJlZS5jYW1lcmFDb250cm9scy51cGRhdGUoKTtcblxuICB0aHJlZS5yZW5kZXJlci5yZW5kZXIodGhyZWUuc2NlbmUsIHRocmVlLmNhbWVyYSk7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uIEV2ZW50IGhhbmRsZXIgZm9yIHdpbmRvdyByZXNpemluZy5cbiAqL1xuZnVuY3Rpb24gb25SZXNpemUoKSB7XG4gIGNvbnN0IHdpZHRoID0gY2FudmFzUGFyZW50RWxlbWVudC5jbGllbnRXaWR0aDtcbiAgY29uc3QgaGVpZ2h0ID0gY2FudmFzUGFyZW50RWxlbWVudC5jbGllbnRIZWlnaHQ7XG4gIHRocmVlLmNhbWVyYS5hc3BlY3QgPSB3aWR0aCAvIGhlaWdodDtcbiAgdGhyZWUuY2FtZXJhLnVwZGF0ZVByb2plY3Rpb25NYXRyaXgoKTtcbiAgdGhyZWUucmVuZGVyZXIuc2V0U2l6ZSh3aWR0aCwgaGVpZ2h0KTtcbiAgdGhyZWUuY2FtZXJhQ29udHJvbHMudXBkYXRlKCk7XG59XG5cbi8qKlxuICogSW5pdGlhbGl6ZXMgdGhlIHRocmVlLmpzIHJlc291cmNlcyBuZWVkZWQgZm9yIHRoaXMgcGFnZVxuICovXG5mdW5jdGlvbiBpbml0aWFsaXplVGhyZWUoKSB7XG4gIGNhbnZhc1BhcmVudEVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbW9kZWxWaWV3ZXInKTtcbiAgY29uc3Qgd2lkdGggPSBjYW52YXNQYXJlbnRFbGVtZW50LmNsaWVudFdpZHRoO1xuICBjb25zdCBoZWlnaHQgPSBjYW52YXNQYXJlbnRFbGVtZW50LmNsaWVudEhlaWdodDtcblxuICB2clByb2ZpbGVzRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd2clByb2ZpbGVzJyk7XG4gIHZyUHJvZmlsZXNMaXN0RWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd2clByb2ZpbGVzTGlzdCcpO1xuXG4gIC8vIFNldCB1cCB0aGUgVEhSRUUuanMgaW5mcmFzdHJ1Y3R1cmVcbiAgdGhyZWUuY2FtZXJhID0gbmV3IFRIUkVFLlBlcnNwZWN0aXZlQ2FtZXJhKDc1LCB3aWR0aCAvIGhlaWdodCwgMC4wMSwgMTAwMCk7XG4gIHRocmVlLmNhbWVyYS5wb3NpdGlvbi55ID0gMC41O1xuICB0aHJlZS5zY2VuZSA9IG5ldyBUSFJFRS5TY2VuZSgpO1xuICB0aHJlZS5zY2VuZS5iYWNrZ3JvdW5kID0gbmV3IFRIUkVFLkNvbG9yKDB4MDBhYTQ0KTtcbiAgdGhyZWUucmVuZGVyZXIgPSBuZXcgVEhSRUUuV2ViR0xSZW5kZXJlcih7IGFudGlhbGlhczogdHJ1ZSB9KTtcbiAgdGhyZWUucmVuZGVyZXIuc2V0U2l6ZSh3aWR0aCwgaGVpZ2h0KTtcbiAgdGhyZWUucmVuZGVyZXIub3V0cHV0RW5jb2RpbmcgPSBUSFJFRS5zUkdCRW5jb2Rpbmc7XG5cbiAgLy8gU2V0IHVwIHRoZSBjb250cm9scyBmb3IgbW92aW5nIHRoZSBzY2VuZSBhcm91bmRcbiAgdGhyZWUuY2FtZXJhQ29udHJvbHMgPSBuZXcgT3JiaXRDb250cm9scyh0aHJlZS5jYW1lcmEsIHRocmVlLnJlbmRlcmVyLmRvbUVsZW1lbnQpO1xuICB0aHJlZS5jYW1lcmFDb250cm9scy5lbmFibGVEYW1waW5nID0gdHJ1ZTtcbiAgdGhyZWUuY2FtZXJhQ29udHJvbHMubWluRGlzdGFuY2UgPSAwLjA1O1xuICB0aHJlZS5jYW1lcmFDb250cm9scy5tYXhEaXN0YW5jZSA9IDAuMztcbiAgdGhyZWUuY2FtZXJhQ29udHJvbHMuZW5hYmxlUGFuID0gZmFsc2U7XG4gIHRocmVlLmNhbWVyYUNvbnRyb2xzLnVwZGF0ZSgpO1xuXG4gIC8vIEFkZCBWUlxuICBjYW52YXNQYXJlbnRFbGVtZW50LmFwcGVuZENoaWxkKFZSQnV0dG9uLmNyZWF0ZUJ1dHRvbih0aHJlZS5yZW5kZXJlcikpO1xuICB0aHJlZS5yZW5kZXJlci54ci5lbmFibGVkID0gdHJ1ZTtcbiAgdGhyZWUucmVuZGVyZXIueHIuYWRkRXZlbnRMaXN0ZW5lcignc2Vzc2lvbnN0YXJ0JywgKCkgPT4ge1xuICAgIHZyUHJvZmlsZXNFbGVtZW50LmhpZGRlbiA9IGZhbHNlO1xuICAgIHZyUHJvZmlsZXNMaXN0RWxlbWVudC5pbm5lckhUTUwgPSAnJztcbiAgICBpc0ltbWVyc2l2ZSA9IHRydWU7XG4gIH0pO1xuICB0aHJlZS5yZW5kZXJlci54ci5hZGRFdmVudExpc3RlbmVyKCdzZXNzaW9uZW5kJywgKCkgPT4geyBpc0ltbWVyc2l2ZSA9IGZhbHNlOyB9KTtcbiAgaW5pdGlhbGl6ZVZSQ29udHJvbGxlcigwKTtcbiAgaW5pdGlhbGl6ZVZSQ29udHJvbGxlcigxKTtcblxuICAvLyBBZGQgdGhlIFRIUkVFLmpzIGNhbnZhcyB0byB0aGUgcGFnZVxuICBjYW52YXNQYXJlbnRFbGVtZW50LmFwcGVuZENoaWxkKHRocmVlLnJlbmRlcmVyLmRvbUVsZW1lbnQpO1xuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgb25SZXNpemUsIGZhbHNlKTtcblxuICAvLyBTdGFydCBwdW1waW5nIGZyYW1lc1xuICB0aHJlZS5yZW5kZXJlci5zZXRBbmltYXRpb25Mb29wKHJlbmRlcik7XG59XG5cbmZ1bmN0aW9uIG9uU2VsZWN0aW9uQ2xlYXIoKSB7XG4gIE1hbnVhbENvbnRyb2xzLmNsZWFyKCk7XG4gIGlmIChtb2NrQ29udHJvbGxlck1vZGVsKSB7XG4gICAgdGhyZWUuc2NlbmUucmVtb3ZlKG1vY2tDb250cm9sbGVyTW9kZWwpO1xuICAgIG1vY2tDb250cm9sbGVyTW9kZWwgPSBudWxsO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIG9uU2VsZWN0aW9uQ2hhbmdlKCkge1xuICBvblNlbGVjdGlvbkNsZWFyKCk7XG4gIGNvbnN0IG1vY2tHYW1lcGFkID0gbmV3IE1vY2tHYW1lcGFkKHByb2ZpbGVTZWxlY3Rvci5wcm9maWxlLCBwcm9maWxlU2VsZWN0b3IuaGFuZGVkbmVzcyk7XG4gIGNvbnN0IG1vY2tYUklucHV0U291cmNlID0gbmV3IE1vY2tYUklucHV0U291cmNlKFxuICAgIFtwcm9maWxlU2VsZWN0b3IucHJvZmlsZS5wcm9maWxlSWRdLCBtb2NrR2FtZXBhZCwgcHJvZmlsZVNlbGVjdG9yLmhhbmRlZG5lc3NcbiAgKTtcbiAgbW9ja0NvbnRyb2xsZXJNb2RlbCA9IG5ldyBDb250cm9sbGVyTW9kZWwobW9ja1hSSW5wdXRTb3VyY2UpO1xuICB0aHJlZS5zY2VuZS5hZGQobW9ja0NvbnRyb2xsZXJNb2RlbCk7XG5cbiAgY29uc3QgbW90aW9uQ29udHJvbGxlciA9IGF3YWl0IHByb2ZpbGVTZWxlY3Rvci5jcmVhdGVNb3Rpb25Db250cm9sbGVyKG1vY2tYUklucHV0U291cmNlKTtcbiAgTWFudWFsQ29udHJvbHMuYnVpbGQobW90aW9uQ29udHJvbGxlcik7XG4gIGF3YWl0IG1vY2tDb250cm9sbGVyTW9kZWwuaW5pdGlhbGl6ZShtb3Rpb25Db250cm9sbGVyKTtcblxuICBpZiAodGhyZWUuZW52aXJvbm1lbnRNYXApIHtcbiAgICBtb2NrQ29udHJvbGxlck1vZGVsLmVudmlyb25tZW50TWFwID0gdGhyZWUuZW52aXJvbm1lbnRNYXA7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gb25CYWNrZ3JvdW5kQ2hhbmdlKCkge1xuICBjb25zdCBwbXJlbUdlbmVyYXRvciA9IG5ldyBUSFJFRS5QTVJFTUdlbmVyYXRvcih0aHJlZS5yZW5kZXJlcik7XG4gIHBtcmVtR2VuZXJhdG9yLmNvbXBpbGVFcXVpcmVjdGFuZ3VsYXJTaGFkZXIoKTtcblxuICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGNvbnN0IHJnYmVMb2FkZXIgPSBuZXcgUkdCRUxvYWRlcigpO1xuICAgIHJnYmVMb2FkZXIuc2V0RGF0YVR5cGUoVEhSRUUuVW5zaWduZWRCeXRlVHlwZSk7XG4gICAgcmdiZUxvYWRlci5zZXRQYXRoKCdiYWNrZ3JvdW5kcy8nKTtcbiAgICByZ2JlTG9hZGVyLmxvYWQoYmFja2dyb3VuZFNlbGVjdG9yLmJhY2tncm91bmRQYXRoLCAodGV4dHVyZSkgPT4ge1xuICAgICAgdGhyZWUuZW52aXJvbm1lbnRNYXAgPSBwbXJlbUdlbmVyYXRvci5mcm9tRXF1aXJlY3Rhbmd1bGFyKHRleHR1cmUpLnRleHR1cmU7XG4gICAgICB0aHJlZS5zY2VuZS5iYWNrZ3JvdW5kID0gdGhyZWUuZW52aXJvbm1lbnRNYXA7XG5cbiAgICAgIGlmIChtb2NrQ29udHJvbGxlck1vZGVsKSB7XG4gICAgICAgIG1vY2tDb250cm9sbGVyTW9kZWwuZW52aXJvbm1lbnRNYXAgPSB0aHJlZS5lbnZpcm9ubWVudE1hcDtcbiAgICAgIH1cblxuICAgICAgcG1yZW1HZW5lcmF0b3IuZGlzcG9zZSgpO1xuICAgICAgcmVzb2x2ZSh0aHJlZS5lbnZpcm9ubWVudE1hcCk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIFBhZ2UgbG9hZCBoYW5kbGVyIGZvciBpbml0aWFsemluZyB0aGluZ3MgdGhhdCBkZXBlbmQgb24gdGhlIERPTSB0byBiZSByZWFkeVxuICovXG5mdW5jdGlvbiBvbkxvYWQoKSB7XG4gIEFzc2V0RXJyb3IuaW5pdGlhbGl6ZSgpO1xuICBwcm9maWxlU2VsZWN0b3IgPSBuZXcgUHJvZmlsZVNlbGVjdG9yKCk7XG4gIGluaXRpYWxpemVUaHJlZSgpO1xuXG4gIHByb2ZpbGVTZWxlY3Rvci5hZGRFdmVudExpc3RlbmVyKCdzZWxlY3Rpb25jbGVhcicsIG9uU2VsZWN0aW9uQ2xlYXIpO1xuICBwcm9maWxlU2VsZWN0b3IuYWRkRXZlbnRMaXN0ZW5lcignc2VsZWN0aW9uY2hhbmdlJywgb25TZWxlY3Rpb25DaGFuZ2UpO1xuXG4gIGJhY2tncm91bmRTZWxlY3RvciA9IG5ldyBCYWNrZ3JvdW5kU2VsZWN0b3IoKTtcbiAgYmFja2dyb3VuZFNlbGVjdG9yLmFkZEV2ZW50TGlzdGVuZXIoJ3NlbGVjdGlvbmNoYW5nZScsIG9uQmFja2dyb3VuZENoYW5nZSk7XG59XG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIG9uTG9hZCk7XG4iXSwibmFtZXMiOlsiVEhSRUUuT2JqZWN0M0QiLCJUSFJFRS5TcGhlcmVHZW9tZXRyeSIsIlRIUkVFLk1lc2hCYXNpY01hdGVyaWFsIiwiVEhSRUUuTWVzaCIsIlRIUkVFLkJ1ZmZlckdlb21ldHJ5IiwiVEhSRUUuRmxvYXQzMkJ1ZmZlckF0dHJpYnV0ZSIsIlRIUkVFLkxpbmVCYXNpY01hdGVyaWFsIiwiVEhSRUUuVmVydGV4Q29sb3JzIiwiVEhSRUUuQWRkaXRpdmVCbGVuZGluZyIsIlRIUkVFLkxpbmUiLCJUSFJFRS5QZXJzcGVjdGl2ZUNhbWVyYSIsIlRIUkVFLlNjZW5lIiwiVEhSRUUuQ29sb3IiLCJUSFJFRS5XZWJHTFJlbmRlcmVyIiwiVEhSRUUuc1JHQkVuY29kaW5nIiwiVEhSRUUuUE1SRU1HZW5lcmF0b3IiLCJUSFJFRS5VbnNpZ25lZEJ5dGVUeXBlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUFBLElBQUksZ0JBQWdCLENBQUM7QUFDckIsSUFBSSxXQUFXLENBQUM7QUFDaEIsSUFBSSxtQkFBbUIsQ0FBQzs7QUFFeEIsU0FBUyxVQUFVLEdBQUc7RUFDcEIsSUFBSSxnQkFBZ0IsRUFBRTtJQUNwQixNQUFNLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsS0FBSztNQUNoRSxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7TUFDcEUsV0FBVyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0tBQ2pFLENBQUMsQ0FBQztHQUNKO0NBQ0Y7O0FBRUQsU0FBUyxtQkFBbUIsQ0FBQyxLQUFLLEVBQUU7RUFDbEMsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDO0VBQ3ZDLFdBQVcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0NBQy9EOztBQUVELFNBQVMsaUJBQWlCLENBQUMsS0FBSyxFQUFFO0VBQ2hDLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQztFQUN2QyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0NBQ3REOztBQUVELFNBQVMsS0FBSyxHQUFHO0VBQ2YsZ0JBQWdCLEdBQUcsU0FBUyxDQUFDO0VBQzdCLFdBQVcsR0FBRyxTQUFTLENBQUM7O0VBRXhCLElBQUksQ0FBQyxtQkFBbUIsRUFBRTtJQUN4QixtQkFBbUIsR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0dBQy9EO0VBQ0QsbUJBQW1CLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztDQUNwQzs7QUFFRCxTQUFTLGlCQUFpQixDQUFDLHdCQUF3QixFQUFFLFdBQVcsRUFBRTtFQUNoRSxNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7RUFDNUQscUJBQXFCLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxtQkFBbUIsQ0FBQyxDQUFDOztFQUVqRSxxQkFBcUIsQ0FBQyxTQUFTLElBQUksQ0FBQzs7cUJBRWpCLEVBQUUsV0FBVyxDQUFDLHFCQUFxQixFQUFFLFdBQVcsQ0FBQztFQUNwRSxDQUFDLENBQUM7O0VBRUYsd0JBQXdCLENBQUMsV0FBVyxDQUFDLHFCQUFxQixDQUFDLENBQUM7O0VBRTVELFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLG1CQUFtQixDQUFDLENBQUM7Q0FDekc7O0FBRUQsU0FBUyxlQUFlLENBQUMsd0JBQXdCLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRTtFQUN0RSxNQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7RUFDMUQsbUJBQW1CLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxtQkFBbUIsQ0FBQyxDQUFDOztFQUUvRCxtQkFBbUIsQ0FBQyxTQUFTLElBQUksQ0FBQztTQUMzQixFQUFFLFFBQVEsQ0FBQztrQkFDRixFQUFFLFNBQVMsQ0FBQyxlQUFlLEVBQUUsU0FBUyxDQUFDOztFQUV2RCxDQUFDLENBQUM7O0VBRUYsd0JBQXdCLENBQUMsV0FBVyxDQUFDLG1CQUFtQixDQUFDLENBQUM7O0VBRTFELFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLGlCQUFpQixDQUFDLENBQUM7Q0FDNUY7O0FBRUQsU0FBUyxLQUFLLENBQUMsc0JBQXNCLEVBQUU7RUFDckMsS0FBSyxFQUFFLENBQUM7O0VBRVIsZ0JBQWdCLEdBQUcsc0JBQXNCLENBQUM7RUFDMUMsV0FBVyxHQUFHLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUM7O0VBRXJELE1BQU0sQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxLQUFLO0lBQ2hFLE1BQU0sd0JBQXdCLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5RCx3QkFBd0IsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQzVELG1CQUFtQixDQUFDLFdBQVcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDOztJQUUxRCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3BELGNBQWMsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzdDLHdCQUF3QixDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQzs7SUFFckQsSUFBSSxTQUFTLENBQUMsY0FBYyxDQUFDLE1BQU0sS0FBSyxTQUFTLEVBQUU7TUFDakQsaUJBQWlCLENBQUMsd0JBQXdCLEVBQUUsU0FBUyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQztLQUM5RTs7SUFFRCxJQUFJLFNBQVMsQ0FBQyxjQUFjLENBQUMsS0FBSyxLQUFLLFNBQVMsRUFBRTtNQUNoRCxlQUFlLENBQUMsd0JBQXdCLEVBQUUsT0FBTyxFQUFFLFNBQVMsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUM7S0FDcEY7O0lBRUQsSUFBSSxTQUFTLENBQUMsY0FBYyxDQUFDLEtBQUssS0FBSyxTQUFTLEVBQUU7TUFDaEQsZUFBZSxDQUFDLHdCQUF3QixFQUFFLE9BQU8sRUFBRSxTQUFTLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQ3BGOztJQUVELE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDbEQsV0FBVyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN4Qyx3QkFBd0IsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUM7R0FDbkQsQ0FBQyxDQUFDO0NBQ0o7O0FBRUQscUJBQWUsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxDQUFDOztBQy9GNUMsSUFBSSxvQkFBb0IsQ0FBQztBQUN6QixJQUFJLGlCQUFpQixDQUFDO0FBQ3RCLE1BQU0sVUFBVSxTQUFTLEtBQUssQ0FBQztFQUM3QixXQUFXLENBQUMsR0FBRyxNQUFNLEVBQUU7SUFDckIsS0FBSyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUM7SUFDakIsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7R0FDOUI7O0VBRUQsT0FBTyxVQUFVLEdBQUc7SUFDbEIsaUJBQWlCLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN0RCxvQkFBb0IsR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0dBQzFEOztFQUVELE9BQU8sR0FBRyxDQUFDLFlBQVksRUFBRTtJQUN2QixNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2pELFdBQVcsQ0FBQyxTQUFTLEdBQUcsWUFBWSxDQUFDO0lBQ3JDLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUMzQyxvQkFBb0IsQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO0dBQ3JDOztFQUVELE9BQU8sUUFBUSxHQUFHO0lBQ2hCLGlCQUFpQixDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7SUFDakMsb0JBQW9CLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztHQUNwQztDQUNGOztBQ3hCRDtBQUNBLEFBTUE7QUFDQSxNQUFNLFVBQVUsR0FBRyxJQUFJLFVBQVUsRUFBRSxDQUFDOztBQUVwQyxNQUFNLGVBQWUsU0FBU0EsUUFBYyxDQUFDO0VBQzNDLFdBQVcsR0FBRztJQUNaLEtBQUssRUFBRSxDQUFDO0lBQ1IsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUM7SUFDMUIsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQztJQUM3QixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztJQUNsQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztJQUNyQixJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztJQUNoQixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztJQUNwQixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztHQUNwQjs7RUFFRCxJQUFJLGNBQWMsQ0FBQyxLQUFLLEVBQUU7SUFDeEIsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLEtBQUssRUFBRTtNQUN6QixPQUFPO0tBQ1I7O0lBRUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7O0lBRXBCLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLEtBQUs7TUFDdkIsSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFO1FBQ2hCLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDcEMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO09BQ25DO0tBQ0YsQ0FBQyxDQUFDOztHQUVKOztFQUVELElBQUksY0FBYyxHQUFHO0lBQ25CLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztHQUNwQjs7RUFFRCxNQUFNLFVBQVUsQ0FBQyxnQkFBZ0IsRUFBRTtJQUNqQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUM7SUFDekMsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxDQUFDOzs7SUFHekQsSUFBSSxDQUFDLEtBQUssR0FBRyxNQUFNLElBQUksT0FBTyxFQUFFLENBQUMsT0FBTyxFQUFFLE1BQU0sS0FBSztNQUNuRCxVQUFVLENBQUMsSUFBSTtRQUNiLGdCQUFnQixDQUFDLFFBQVE7UUFDekIsQ0FBQyxXQUFXLEtBQUssRUFBRSxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRTtRQUMxQyxJQUFJO1FBQ0osTUFBTSxFQUFFLE1BQU0sQ0FBQyxJQUFJLFVBQVUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtPQUM5RixDQUFDO0tBQ0gsRUFBRSxDQUFDOztJQUVKLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTs7TUFFZixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLEtBQUs7UUFDbkMsSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFO1VBQ2hCLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7U0FDckM7T0FDRixDQUFDLENBQUM7O0tBRUo7O0lBRUQsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQztJQUNqQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDcEIsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ2pCLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3hCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO0dBQ3BCOzs7Ozs7RUFNRCxpQkFBaUIsQ0FBQyxLQUFLLEVBQUU7SUFDdkIsS0FBSyxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDOztJQUUvQixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtNQUNoQixPQUFPO0tBQ1I7OztJQUdELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDOzs7SUFHMUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxLQUFLOztNQUVyRSxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxjQUFjLEtBQUs7UUFDbkUsTUFBTTtVQUNKLGFBQWEsRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxpQkFBaUI7U0FDbEUsR0FBRyxjQUFjLENBQUM7UUFDbkIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQzs7OztRQUk1QyxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU87OztRQUd2QixJQUFJLGlCQUFpQixLQUFLLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxVQUFVLEVBQUU7VUFDckUsU0FBUyxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7U0FDM0IsTUFBTSxJQUFJLGlCQUFpQixLQUFLLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxTQUFTLEVBQUU7VUFDM0UsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztVQUN4QyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1VBQ3hDLFNBQVMsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCO1lBQ25DLE9BQU8sQ0FBQyxVQUFVO1lBQ2xCLE9BQU8sQ0FBQyxVQUFVO1lBQ2xCLEtBQUs7V0FDTixDQUFDOztVQUVGLFNBQVMsQ0FBQyxRQUFRLENBQUMsV0FBVztZQUM1QixPQUFPLENBQUMsUUFBUTtZQUNoQixPQUFPLENBQUMsUUFBUTtZQUNoQixLQUFLO1dBQ04sQ0FBQztTQUNIO09BQ0YsQ0FBQyxDQUFDO0tBQ0osQ0FBQyxDQUFDO0dBQ0o7Ozs7OztFQU1ELFNBQVMsR0FBRztJQUNWLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDOzs7SUFHaEIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxLQUFLO01BQ3JFLE1BQU0sRUFBRSxrQkFBa0IsRUFBRSxlQUFlLEVBQUUsR0FBRyxTQUFTLENBQUM7TUFDMUQsSUFBSSxrQkFBa0IsRUFBRTtRQUN0QixJQUFJLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsa0JBQWtCLENBQUMsQ0FBQztPQUNwRjs7O01BR0QsTUFBTSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxjQUFjLEtBQUs7UUFDekQsTUFBTTtVQUNKLGFBQWEsRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLGlCQUFpQjtTQUMzRCxHQUFHLGNBQWMsQ0FBQzs7UUFFbkIsSUFBSSxpQkFBaUIsS0FBSyxTQUFTLENBQUMsc0JBQXNCLENBQUMsU0FBUyxFQUFFO1VBQ3BFLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLENBQUM7VUFDckUsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsQ0FBQzs7O1VBR3JFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxFQUFFO1lBQzVCLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxlQUFlLEVBQUUsV0FBVyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7WUFDN0QsT0FBTztXQUNSO1VBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEVBQUU7WUFDNUIsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLGVBQWUsRUFBRSxXQUFXLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztZQUM3RCxPQUFPO1dBQ1I7U0FDRjs7O1FBR0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUN6RSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsRUFBRTtVQUM5QixVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1NBQ2hFO09BQ0YsQ0FBQyxDQUFDO0tBQ0osQ0FBQyxDQUFDO0dBQ0o7Ozs7O0VBS0QsWUFBWSxHQUFHO0lBQ2IsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsV0FBVyxLQUFLO01BQ3JFLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7O01BRWhFLElBQUksU0FBUyxDQUFDLElBQUksS0FBSyxTQUFTLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRTs7UUFFdkQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3pGLElBQUksQ0FBQyxjQUFjLEVBQUU7VUFDbkIsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLDBCQUEwQixFQUFFLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyx3QkFBd0IsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDbkgsTUFBTTtVQUNMLE1BQU0sY0FBYyxHQUFHLElBQUlDLGNBQW9CLENBQUMsS0FBSyxDQUFDLENBQUM7VUFDdkQsTUFBTSxRQUFRLEdBQUcsSUFBSUMsaUJBQXVCLENBQUMsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztVQUNsRSxNQUFNLE1BQU0sR0FBRyxJQUFJQyxJQUFVLENBQUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1VBQ3hELGNBQWMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDNUI7T0FDRjtLQUNGLENBQUMsQ0FBQztHQUNKO0NBQ0Y7O0FDM0xEO0FBQ0EsQUFPQTs7OztBQUlBLE1BQU0sWUFBWSxTQUFTLFdBQVcsQ0FBQztFQUNyQyxXQUFXLEdBQUc7SUFDWixLQUFLLEVBQUUsQ0FBQzs7SUFFUixJQUFJLENBQUMscUJBQXFCLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3ZFLElBQUksQ0FBQyxhQUFhLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQ25FLElBQUksQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLE1BQU07TUFDbEQsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO0tBQ3hCLENBQUMsQ0FBQzs7SUFFSCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7O0lBRWIsWUFBWSxDQUFDLG9CQUFvQixDQUFDLG9DQUFvQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsdUJBQXVCLEtBQUs7TUFDeEcsSUFBSSxDQUFDLHVCQUF1QixHQUFHLHVCQUF1QixDQUFDO01BQ3ZELFlBQVksQ0FBQyxvQkFBb0IsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLG9CQUFvQixLQUFLO1FBQy9GLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxvQkFBb0IsQ0FBQztRQUNqRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUM7UUFDNUIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsQ0FBQztPQUN0QyxDQUFDLENBQUM7S0FDSixDQUFDLENBQUM7R0FDSjs7Ozs7RUFLRCxLQUFLLEdBQUc7SUFDTixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7TUFDaEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7TUFDcEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7TUFDdEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7TUFDakIsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7O01BRTFDLE1BQU0sV0FBVyxHQUFHLElBQUksS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQUM7TUFDcEQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQztLQUNqQztHQUNGOzs7Ozs7RUFNRCxNQUFNLGVBQWUsQ0FBQyxjQUFjLEVBQUU7SUFDcEMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDOzs7SUFHYixJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFO01BQzlCLE9BQU87S0FDUjs7O0lBR0QsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDO0lBQ2xCLElBQUksYUFBYSxDQUFDO0lBQ2xCLElBQUksZ0JBQWdCLENBQUM7O0lBRXJCLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN2RCxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxLQUFLO01BQzFCLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUU7UUFDOUIsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztPQUN0RCxNQUFNLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxjQUFjLEVBQUU7UUFDdkMsYUFBYSxHQUFHLElBQUksQ0FBQztPQUN0QixNQUFNLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDdEMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDO09BQ3pCOzs7TUFHRCxJQUFJLENBQUMscUJBQXFCLENBQUMsU0FBUyxJQUFJLENBQUM7WUFDbkMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDO01BQ2xCLENBQUMsQ0FBQztLQUNILENBQUMsQ0FBQzs7SUFFSCxJQUFJLENBQUMsZ0JBQWdCLEVBQUU7TUFDckIsVUFBVSxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO01BQy9DLE9BQU87S0FDUjs7SUFFRCxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ2pFLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDOzs7OztJQUtyQixJQUFJLENBQUMsY0FBYyxFQUFFO01BQ25CLE1BQU0sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7S0FDMUQ7OztJQUdELE1BQU0sV0FBVyxHQUFHLElBQUksS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQUM7SUFDcEQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQztHQUNqQzs7Ozs7OztFQU9ELE1BQU0sWUFBWSxDQUFDLGdCQUFnQixFQUFFLGFBQWEsRUFBRTs7SUFFbEQsTUFBTSxZQUFZLEdBQUcsTUFBTSxZQUFZLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDeEUsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDdkUsSUFBSSxDQUFDLG1CQUFtQixFQUFFO01BQ3hCLE1BQU0sSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3BGOzs7O0lBSUQsSUFBSSxTQUFTLENBQUM7SUFDZCxJQUFJLENBQUMsYUFBYSxFQUFFO01BQ2xCLFNBQVMsR0FBRyxFQUFFLFNBQVMsRUFBRSxZQUFZLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsQ0FBQztLQUNsRSxNQUFNO01BQ0wsU0FBUyxHQUFHLE1BQU0sWUFBWSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQztNQUM1RCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztNQUM5RCxJQUFJLENBQUMsZ0JBQWdCLEVBQUU7UUFDckIsTUFBTSxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7T0FDakY7S0FDRjs7O0lBR0QsdUJBQXVCLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDdEMsTUFBTSx1QkFBdUIsR0FBRyxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUNwRSxJQUFJLENBQUMsT0FBTyxHQUFHLGlCQUFpQixDQUFDLFNBQVMsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO0lBQ3JFLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7R0FDekM7Ozs7OztFQU1ELE9BQU8sYUFBYSxDQUFDLFFBQVEsRUFBRTtJQUM3QixPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sS0FBSztNQUN0QyxNQUFNLE1BQU0sR0FBRyxJQUFJLFVBQVUsRUFBRSxDQUFDOztNQUVoQyxNQUFNLENBQUMsTUFBTSxHQUFHLE1BQU07UUFDcEIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdkMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO09BQ2YsQ0FBQzs7TUFFRixNQUFNLENBQUMsT0FBTyxHQUFHLE1BQU07UUFDckIsTUFBTSxZQUFZLEdBQUcsQ0FBQyx5QkFBeUIsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNqRSxVQUFVLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzdCLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztPQUN0QixDQUFDOztNQUVGLE1BQU0sQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDN0IsQ0FBQyxDQUFDO0dBQ0o7Ozs7OztFQU1ELGFBQWEsb0JBQW9CLENBQUMsV0FBVyxFQUFFO0lBQzdDLE1BQU0sUUFBUSxHQUFHLE1BQU0sS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFO01BQ2hCLE1BQU0sSUFBSSxVQUFVLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0tBQzNDOzs7SUFHRCxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO0lBQ3RCLE1BQU0sT0FBTyxHQUFHLE1BQU0sUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3RDLE9BQU8sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxLQUFLO01BQ3ZDLEdBQUcsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7S0FDdkIsQ0FBQyxDQUFDOztJQUVILE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7R0FDeEM7Q0FDRjs7QUNqTEQ7QUFDQSxBQUtBO0FBQ0EsTUFBTSxnQkFBZ0IsR0FBRyxZQUFZLENBQUM7Ozs7O0FBS3RDLE1BQU0sZUFBZSxTQUFTLFdBQVcsQ0FBQztFQUN4QyxXQUFXLEdBQUc7SUFDWixLQUFLLEVBQUUsQ0FBQzs7O0lBR1IsSUFBSSxDQUFDLHdCQUF3QixHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUM3RSxJQUFJLENBQUMsd0JBQXdCLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQzs7O0lBRzlGLElBQUksQ0FBQyx5QkFBeUIsR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLG9CQUFvQixDQUFDLENBQUM7SUFDL0UsSUFBSSxDQUFDLHlCQUF5QixDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7O0lBRWhHLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDdkUsSUFBSSxDQUFDLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDLENBQUM7O0lBRXJFLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxZQUFZLEVBQUUsQ0FBQztJQUN2QyxJQUFJLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixFQUFFLENBQUMsS0FBSyxLQUFLLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDOztJQUUzRyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztJQUN6QixJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztHQUNoQzs7Ozs7RUFLRCxvQkFBb0IsR0FBRztJQUNyQixVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDdEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7SUFDcEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7R0FDeEI7Ozs7O0VBS0QsTUFBTSx1QkFBdUIsR0FBRztJQUM5QixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztJQUM1QixJQUFJLENBQUMseUJBQXlCLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQzs7O0lBRzlDLE1BQU0sZUFBZSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ2pFLE1BQU0sQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDOzs7SUFHNUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUU7TUFDdEIsSUFBSTtRQUNGLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTLEdBQUcsNkNBQTZDLENBQUM7UUFDeEYsSUFBSSxDQUFDLFlBQVksR0FBRyxNQUFNLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLENBQUM7T0FDL0QsQ0FBQyxPQUFPLEtBQUssRUFBRTtRQUNkLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTLEdBQUcscUJBQXFCLENBQUM7UUFDaEUsVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDOUIsTUFBTSxLQUFLLENBQUM7T0FDYjtLQUNGOzs7SUFHRCxJQUFJLENBQUMsd0JBQXdCLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztJQUM3QyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLEtBQUs7TUFDcEQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQztNQUM3QyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRTtRQUN2QixJQUFJLENBQUMsd0JBQXdCLENBQUMsU0FBUyxJQUFJLENBQUM7dUJBQzdCLEVBQUUsU0FBUyxDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUM7UUFDekMsQ0FBQyxDQUFDO09BQ0g7S0FDRixDQUFDLENBQUM7OztJQUdILElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTO1FBQzNCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLEVBQUU7TUFDekUsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFNBQVMsSUFBSSxDQUFDO3FCQUM3QixFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQztNQUM3RSxDQUFDLENBQUM7TUFDRixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQztLQUNwRTs7O0lBR0QsSUFBSSxlQUFlLEVBQUU7TUFDbkIsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEtBQUssR0FBRyxlQUFlLENBQUM7S0FDdkQ7OztJQUdELElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0dBQzFCOzs7OztFQUtELGlCQUFpQixHQUFHO0lBQ2xCLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO0lBQzVCLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDOztJQUU5QyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDO0lBQ3RELE1BQU0sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQzs7SUFFcEQsSUFBSSxTQUFTLEtBQUssSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUU7TUFDN0MsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQztNQUN6QyxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztLQUNuQyxNQUFNOztNQUVMLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO01BQzlDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO01BQy9DLFlBQVksQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSztRQUM5RyxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN2QixJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztPQUNuQyxDQUFDO1NBQ0MsS0FBSyxDQUFDLENBQUMsS0FBSyxLQUFLO1VBQ2hCLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1VBQzlCLE1BQU0sS0FBSyxDQUFDO1NBQ2IsQ0FBQztTQUNELE9BQU8sQ0FBQyxNQUFNO1VBQ2IsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7VUFDL0MsSUFBSSxDQUFDLHlCQUF5QixDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7U0FDakQsQ0FBQyxDQUFDO0tBQ047R0FDRjs7Ozs7RUFLRCwwQkFBMEIsR0FBRzs7SUFFM0IsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUNuRSxNQUFNLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQzs7O0lBRzdDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxVQUFVLEtBQUs7TUFDeEQsSUFBSSxDQUFDLHlCQUF5QixDQUFDLFNBQVMsSUFBSSxDQUFDO3VCQUM1QixFQUFFLFVBQVUsQ0FBQyxFQUFFLEVBQUUsVUFBVSxDQUFDO01BQzdDLENBQUMsQ0FBQztLQUNILENBQUMsQ0FBQzs7O0lBR0gsSUFBSSxnQkFBZ0IsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO01BQzlELElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLEdBQUcsZ0JBQWdCLENBQUM7S0FDekQ7OztJQUdELElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO0dBQzNCOzs7Ozs7O0VBT0Qsa0JBQWtCLEdBQUc7SUFDbkIsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQ3RCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEtBQUssQ0FBQztJQUN2RCxNQUFNLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzNELElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRTtNQUNuQixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztLQUNsRCxNQUFNO01BQ0wsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7S0FDakQ7R0FDRjs7Ozs7RUFLRCxvQkFBb0IsR0FBRztJQUNyQixJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztHQUNoQzs7Ozs7O0VBTUQsSUFBSSxjQUFjLEdBQUc7SUFDbkIsT0FBTyxJQUFJLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDO0dBQzNDOzs7Ozs7RUFNRCxJQUFJLGFBQWEsR0FBRztJQUNsQixPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUM7R0FDMUM7Ozs7Ozs7RUFPRCxNQUFNLHNCQUFzQixDQUFDLGFBQWEsRUFBRTtJQUMxQyxJQUFJLE9BQU8sQ0FBQztJQUNaLElBQUksU0FBUyxDQUFDOzs7SUFHZCxJQUFJLGVBQWUsR0FBRyxLQUFLLENBQUM7SUFDNUIsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRTtNQUMvQixhQUFhLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsS0FBSztRQUN6QyxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdEUsZUFBZSxHQUFHLFVBQVUsS0FBSyxTQUFTLEtBQUssSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM1RSxPQUFPLFVBQVUsQ0FBQztPQUNuQixDQUFDLENBQUM7S0FDSjs7O0lBR0QsSUFBSSxlQUFlLEVBQUU7TUFDbkIsQ0FBQyxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUU7TUFDbEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxTQUFTLENBQUM7TUFDeEYsU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLFNBQVMsQ0FBQztLQUM5RCxNQUFNO01BQ0wsQ0FBQyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsR0FBRyxNQUFNLFlBQVksQ0FBQyxhQUFhLEVBQUUsZ0JBQWdCLENBQUMsRUFBRTtLQUNoRjs7O0lBR0QsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLGdCQUFnQjtNQUMzQyxhQUFhO01BQ2IsT0FBTztNQUNQLFNBQVM7S0FDVixDQUFDOztJQUVGLE9BQU8sZ0JBQWdCLENBQUM7R0FDekI7Q0FDRjs7QUNuT0QsTUFBTSxpQkFBaUIsR0FBRyxZQUFZLENBQUM7O0FBRXZDLEFBQWUsTUFBTSxrQkFBa0IsU0FBUyxXQUFXLENBQUM7RUFDMUQsV0FBVyxHQUFHO0lBQ1osS0FBSyxFQUFFLENBQUM7O0lBRVIsSUFBSSxDQUFDLHlCQUF5QixHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsb0JBQW9CLENBQUMsQ0FBQztJQUMvRSxJQUFJLENBQUMseUJBQXlCLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQzs7SUFFaEcsSUFBSSxDQUFDLGtCQUFrQixHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLGlCQUFpQixDQUFDO0lBQ3pGLElBQUksQ0FBQyxjQUFjLEdBQUcsRUFBRSxDQUFDO0lBQ3pCLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQztPQUNsQyxJQUFJLENBQUMsUUFBUSxJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztPQUNqQyxJQUFJLENBQUMsQ0FBQyxXQUFXLEtBQUs7UUFDckIsSUFBSSxDQUFDLGNBQWMsR0FBRyxXQUFXLENBQUM7UUFDbEMsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxVQUFVLEtBQUs7VUFDL0MsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztVQUNoRCxNQUFNLENBQUMsS0FBSyxHQUFHLFVBQVUsQ0FBQztVQUMxQixNQUFNLENBQUMsU0FBUyxHQUFHLFVBQVUsQ0FBQztVQUM5QixJQUFJLElBQUksQ0FBQyxrQkFBa0IsS0FBSyxVQUFVLEVBQUU7WUFDMUMsTUFBTSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7V0FDeEI7VUFDRCxJQUFJLENBQUMseUJBQXlCLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ3BELENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO09BQ2xELENBQUMsQ0FBQztHQUNOOztFQUVELGtCQUFrQixHQUFHO0lBQ25CLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxDQUFDO0lBQy9ELE1BQU0sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUNuRSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztHQUNsRDs7RUFFRCxJQUFJLGNBQWMsR0FBRztJQUNuQixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7R0FDckQ7Q0FDRjs7QUNyQ0Q7QUFDQSxBQUNBOzs7OztBQUtBLE1BQU0sV0FBVyxDQUFDOzs7Ozs7RUFNaEIsV0FBVyxDQUFDLGtCQUFrQixFQUFFLFVBQVUsRUFBRTtJQUMxQyxJQUFJLENBQUMsa0JBQWtCLEVBQUU7TUFDdkIsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO0tBQ25EOztJQUVELElBQUksQ0FBQyxVQUFVLEVBQUU7TUFDZixNQUFNLElBQUksS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUM7S0FDM0M7O0lBRUQsSUFBSSxDQUFDLEVBQUUsR0FBRyxrQkFBa0IsQ0FBQyxTQUFTLENBQUM7Ozs7SUFJdkMsSUFBSSxjQUFjLEdBQUcsQ0FBQyxDQUFDO0lBQ3ZCLElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQztJQUNyQixNQUFNLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDdEQsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDO0lBQzlCLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsY0FBYyxFQUFFLEtBQUs7TUFDL0QsTUFBTTtRQUNKLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLE1BQU0sR0FBRyxXQUFXO1FBQ2pELENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLE1BQU0sR0FBRyxVQUFVO1FBQ2hELENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLE1BQU0sR0FBRyxVQUFVO09BQ2pELEdBQUcsY0FBYyxDQUFDOztNQUVuQixJQUFJLFdBQVcsS0FBSyxTQUFTLElBQUksV0FBVyxHQUFHLGNBQWMsRUFBRTtRQUM3RCxjQUFjLEdBQUcsV0FBVyxDQUFDO09BQzlCOztNQUVELElBQUksVUFBVSxLQUFLLFNBQVMsS0FBSyxVQUFVLEdBQUcsWUFBWSxDQUFDLEVBQUU7UUFDM0QsWUFBWSxHQUFHLFVBQVUsQ0FBQztPQUMzQjs7TUFFRCxJQUFJLFVBQVUsS0FBSyxTQUFTLEtBQUssVUFBVSxHQUFHLFlBQVksQ0FBQyxFQUFFO1FBQzNELFlBQVksR0FBRyxVQUFVLENBQUM7T0FDM0I7S0FDRixDQUFDLENBQUM7OztJQUdILElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDO0lBQ2YsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxZQUFZLEVBQUU7TUFDdkMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDbkI7OztJQUdELElBQUksQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO0lBQ2xCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLElBQUksY0FBYyxFQUFFO01BQzVDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1FBQ2hCLEtBQUssRUFBRSxDQUFDO1FBQ1IsT0FBTyxFQUFFLEtBQUs7UUFDZCxPQUFPLEVBQUUsS0FBSztPQUNmLENBQUMsQ0FBQztLQUNKO0dBQ0Y7Q0FDRjs7QUNsRUQ7OztBQUdBLE1BQU0saUJBQWlCLENBQUM7Ozs7O0VBS3RCLFdBQVcsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRTtJQUN6QyxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQzs7SUFFdkIsSUFBSSxDQUFDLFVBQVUsRUFBRTtNQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQztLQUMzQzs7SUFFRCxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztJQUM3QixJQUFJLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7R0FDekM7Q0FDRjs7QUNsQkQ7QUFDQSxBQWFBO0FBQ0EsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDO0FBQ2pCLElBQUksbUJBQW1CLENBQUM7QUFDeEIsSUFBSSxpQkFBaUIsQ0FBQztBQUN0QixJQUFJLHFCQUFxQixDQUFDOztBQUUxQixJQUFJLGVBQWUsQ0FBQztBQUNwQixJQUFJLGtCQUFrQixDQUFDO0FBQ3ZCLElBQUksbUJBQW1CLENBQUM7QUFDeEIsSUFBSSxXQUFXLEdBQUcsS0FBSyxDQUFDOzs7Ozs7O0FBT3hCLFNBQVMsc0JBQXNCLENBQUMsS0FBSyxFQUFFO0VBQ3JDLE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUM7O0VBRXBFLGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxPQUFPLEtBQUssS0FBSztJQUM5RCxNQUFNLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO0lBQzlDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQzs7SUFFdEMsSUFBSSxhQUFhLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQzs7SUFFL0IscUJBQXFCLENBQUMsU0FBUyxJQUFJLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7O0lBRTlHLElBQUksZUFBZSxDQUFDLGNBQWMsRUFBRTtNQUNsQyxhQUFhLEdBQUcsSUFBSSxpQkFBaUI7UUFDbkMsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVTtPQUMvRSxDQUFDO0tBQ0g7O0lBRUQsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLGVBQWUsQ0FBQyxzQkFBc0IsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUNyRixNQUFNLGVBQWUsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsQ0FBQzs7SUFFbkQsSUFBSSxLQUFLLENBQUMsY0FBYyxFQUFFO01BQ3hCLGVBQWUsQ0FBQyxjQUFjLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQztLQUN2RDtHQUNGLENBQUMsQ0FBQzs7RUFFSCxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLEVBQUUsTUFBTTtJQUN0RCxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7R0FDdkQsQ0FBQyxDQUFDOztFQUVILEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUM7O0VBRWxDLE1BQU0sa0JBQWtCLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDOztFQUVsRSxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsTUFBTTtJQUNyRCxJQUFJLGVBQWUsQ0FBQyxhQUFhLEVBQUU7TUFDakMsTUFBTSxRQUFRLEdBQUcsSUFBSUMsY0FBb0IsRUFBRSxDQUFDO01BQzVDLFFBQVEsQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLElBQUlDLHNCQUE0QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7TUFDNUYsUUFBUSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsSUFBSUEsc0JBQTRCLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7O01BRTlGLE1BQU0sUUFBUSxHQUFHLElBQUlDLGlCQUF1QixDQUFDO1FBQzNDLFlBQVksRUFBRUMsWUFBa0I7UUFDaEMsUUFBUSxFQUFFQyxnQkFBc0I7T0FDakMsQ0FBQyxDQUFDOztNQUVILGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJQyxJQUFVLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7S0FDNUQ7R0FDRixDQUFDLENBQUM7O0VBRUgsa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxFQUFFLE1BQU07SUFDeEQsSUFBSSxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFO01BQ3RDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMzRDtHQUNGLENBQUMsQ0FBQzs7RUFFSCxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0NBQ3JDOzs7OztBQUtELFNBQVMsTUFBTSxHQUFHO0VBQ2hCLElBQUksbUJBQW1CLEVBQUU7SUFDdkIsSUFBSSxXQUFXLEVBQUU7TUFDZixLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0tBQ3pDLE1BQU07TUFDTCxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO01BQ3JDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztLQUM3QjtHQUNGOztFQUVELEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUM7O0VBRTlCLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0NBQ2xEOzs7OztBQUtELFNBQVMsUUFBUSxHQUFHO0VBQ2xCLE1BQU0sS0FBSyxHQUFHLG1CQUFtQixDQUFDLFdBQVcsQ0FBQztFQUM5QyxNQUFNLE1BQU0sR0FBRyxtQkFBbUIsQ0FBQyxZQUFZLENBQUM7RUFDaEQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsS0FBSyxHQUFHLE1BQU0sQ0FBQztFQUNyQyxLQUFLLENBQUMsTUFBTSxDQUFDLHNCQUFzQixFQUFFLENBQUM7RUFDdEMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0VBQ3RDLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUM7Q0FDL0I7Ozs7O0FBS0QsU0FBUyxlQUFlLEdBQUc7RUFDekIsbUJBQW1CLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQztFQUM3RCxNQUFNLEtBQUssR0FBRyxtQkFBbUIsQ0FBQyxXQUFXLENBQUM7RUFDOUMsTUFBTSxNQUFNLEdBQUcsbUJBQW1CLENBQUMsWUFBWSxDQUFDOztFQUVoRCxpQkFBaUIsR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDO0VBQzFELHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQzs7O0VBR2xFLEtBQUssQ0FBQyxNQUFNLEdBQUcsSUFBSUMsaUJBQXVCLENBQUMsRUFBRSxFQUFFLEtBQUssR0FBRyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0VBQzNFLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUM7RUFDOUIsS0FBSyxDQUFDLEtBQUssR0FBRyxJQUFJQyxLQUFXLEVBQUUsQ0FBQztFQUNoQyxLQUFLLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxJQUFJQyxLQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7RUFDbkQsS0FBSyxDQUFDLFFBQVEsR0FBRyxJQUFJQyxhQUFtQixDQUFDLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7RUFDOUQsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0VBQ3RDLEtBQUssQ0FBQyxRQUFRLENBQUMsY0FBYyxHQUFHQyxZQUFrQixDQUFDOzs7RUFHbkQsS0FBSyxDQUFDLGNBQWMsR0FBRyxJQUFJLGFBQWEsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7RUFDbEYsS0FBSyxDQUFDLGNBQWMsQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO0VBQzFDLEtBQUssQ0FBQyxjQUFjLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztFQUN4QyxLQUFLLENBQUMsY0FBYyxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUM7RUFDdkMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO0VBQ3ZDLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUM7OztFQUc5QixtQkFBbUIsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztFQUN2RSxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO0VBQ2pDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsRUFBRSxNQUFNO0lBQ3ZELGlCQUFpQixDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7SUFDakMscUJBQXFCLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztJQUNyQyxXQUFXLEdBQUcsSUFBSSxDQUFDO0dBQ3BCLENBQUMsQ0FBQztFQUNILEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxNQUFNLEVBQUUsV0FBVyxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztFQUNqRixzQkFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUMxQixzQkFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7O0VBRzFCLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0VBQzNELE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDOzs7RUFHbkQsS0FBSyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztDQUN6Qzs7QUFFRCxTQUFTLGdCQUFnQixHQUFHO0VBQzFCLGNBQWMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztFQUN2QixJQUFJLG1CQUFtQixFQUFFO0lBQ3ZCLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLENBQUM7SUFDeEMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDO0dBQzVCO0NBQ0Y7O0FBRUQsZUFBZSxpQkFBaUIsR0FBRztFQUNqQyxnQkFBZ0IsRUFBRSxDQUFDO0VBQ25CLE1BQU0sV0FBVyxHQUFHLElBQUksV0FBVyxDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0VBQ3pGLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxpQkFBaUI7SUFDN0MsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLFdBQVcsRUFBRSxlQUFlLENBQUMsVUFBVTtHQUM3RSxDQUFDO0VBQ0YsbUJBQW1CLEdBQUcsSUFBSSxlQUFlLENBQUMsaUJBQWlCLENBQUMsQ0FBQztFQUM3RCxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDOztFQUVyQyxNQUFNLGdCQUFnQixHQUFHLE1BQU0sZUFBZSxDQUFDLHNCQUFzQixDQUFDLGlCQUFpQixDQUFDLENBQUM7RUFDekYsY0FBYyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0VBQ3ZDLE1BQU0sbUJBQW1CLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLENBQUM7O0VBRXZELElBQUksS0FBSyxDQUFDLGNBQWMsRUFBRTtJQUN4QixtQkFBbUIsQ0FBQyxjQUFjLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQztHQUMzRDtDQUNGOztBQUVELGVBQWUsa0JBQWtCLEdBQUc7RUFDbEMsTUFBTSxjQUFjLEdBQUcsSUFBSUMsY0FBb0IsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7RUFDaEUsY0FBYyxDQUFDLDRCQUE0QixFQUFFLENBQUM7O0VBRTlDLE1BQU0sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEtBQUs7SUFDN0IsTUFBTSxVQUFVLEdBQUcsSUFBSSxVQUFVLEVBQUUsQ0FBQztJQUNwQyxVQUFVLENBQUMsV0FBVyxDQUFDQyxnQkFBc0IsQ0FBQyxDQUFDO0lBQy9DLFVBQVUsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDbkMsVUFBVSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxPQUFPLEtBQUs7TUFDOUQsS0FBSyxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDO01BQzNFLEtBQUssQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUM7O01BRTlDLElBQUksbUJBQW1CLEVBQUU7UUFDdkIsbUJBQW1CLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUM7T0FDM0Q7O01BRUQsY0FBYyxDQUFDLE9BQU8sRUFBRSxDQUFDO01BQ3pCLE9BQU8sQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUM7S0FDL0IsQ0FBQyxDQUFDO0dBQ0osQ0FBQyxDQUFDO0NBQ0o7Ozs7O0FBS0QsU0FBUyxNQUFNLEdBQUc7RUFDaEIsVUFBVSxDQUFDLFVBQVUsRUFBRSxDQUFDO0VBQ3hCLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO0VBQ3hDLGVBQWUsRUFBRSxDQUFDOztFQUVsQixlQUFlLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztFQUNyRSxlQUFlLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQzs7RUFFdkUsa0JBQWtCLEdBQUcsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO0VBQzlDLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixFQUFFLGtCQUFrQixDQUFDLENBQUM7Q0FDNUU7QUFDRCxNQUFNLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDIn0=
