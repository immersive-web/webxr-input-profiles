import { Object3D, SphereGeometry, MeshBasicMaterial, Mesh, PerspectiveCamera, Scene, Color, WebGLRenderer, sRGBEncoding, PMREMGenerator, UnsignedByteType, BufferGeometry, Float32BufferAttribute, LineBasicMaterial, VertexColors, AdditiveBlending, Line } from './three/build/three.module.js';
import { OrbitControls } from './three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from './three/examples/jsm/loaders/RGBELoader.js';
import { VRButton } from './three/examples/jsm/webxr/VRButton.js';
import { GLTFLoader } from './three/examples/jsm/loaders/GLTFLoader.js';
import { Constants, fetchProfilesList, fetchProfile, MotionController } from './motion-controllers.module.js';
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxWaWV3ZXIuanMiLCJzb3VyY2VzIjpbIi4uL3NyYy9tYW51YWxDb250cm9scy5qcyIsIi4uL3NyYy9hc3NldEVycm9yLmpzIiwiLi4vc3JjL2NvbnRyb2xsZXJNb2RlbC5qcyIsIi4uL3NyYy9sb2NhbFByb2ZpbGUuanMiLCIuLi9zcmMvcHJvZmlsZVNlbGVjdG9yLmpzIiwiLi4vc3JjL2JhY2tncm91bmRTZWxlY3Rvci5qcyIsIi4uL3NyYy9tb2Nrcy9tb2NrR2FtZXBhZC5qcyIsIi4uL3NyYy9tb2Nrcy9tb2NrWFJJbnB1dFNvdXJjZS5qcyIsIi4uL3NyYy9tb2RlbFZpZXdlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJsZXQgbW90aW9uQ29udHJvbGxlcjtcbmxldCBtb2NrR2FtZXBhZDtcbmxldCBjb250cm9sc0xpc3RFbGVtZW50O1xuXG5mdW5jdGlvbiB1cGRhdGVUZXh0KCkge1xuICBpZiAobW90aW9uQ29udHJvbGxlcikge1xuICAgIE9iamVjdC52YWx1ZXMobW90aW9uQ29udHJvbGxlci5jb21wb25lbnRzKS5mb3JFYWNoKChjb21wb25lbnQpID0+IHtcbiAgICAgIGNvbnN0IGRhdGFFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYCR7Y29tcG9uZW50LmlkfV9kYXRhYCk7XG4gICAgICBkYXRhRWxlbWVudC5pbm5lckhUTUwgPSBKU09OLnN0cmluZ2lmeShjb21wb25lbnQuZGF0YSwgbnVsbCwgMik7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gb25CdXR0b25WYWx1ZUNoYW5nZShldmVudCkge1xuICBjb25zdCB7IGluZGV4IH0gPSBldmVudC50YXJnZXQuZGF0YXNldDtcbiAgbW9ja0dhbWVwYWQuYnV0dG9uc1tpbmRleF0udmFsdWUgPSBOdW1iZXIoZXZlbnQudGFyZ2V0LnZhbHVlKTtcbn1cblxuZnVuY3Rpb24gb25BeGlzVmFsdWVDaGFuZ2UoZXZlbnQpIHtcbiAgY29uc3QgeyBpbmRleCB9ID0gZXZlbnQudGFyZ2V0LmRhdGFzZXQ7XG4gIG1vY2tHYW1lcGFkLmF4ZXNbaW5kZXhdID0gTnVtYmVyKGV2ZW50LnRhcmdldC52YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIGNsZWFyKCkge1xuICBtb3Rpb25Db250cm9sbGVyID0gdW5kZWZpbmVkO1xuICBtb2NrR2FtZXBhZCA9IHVuZGVmaW5lZDtcblxuICBpZiAoIWNvbnRyb2xzTGlzdEVsZW1lbnQpIHtcbiAgICBjb250cm9sc0xpc3RFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbnRyb2xzTGlzdCcpO1xuICB9XG4gIGNvbnRyb2xzTGlzdEVsZW1lbnQuaW5uZXJIVE1MID0gJyc7XG59XG5cbmZ1bmN0aW9uIGFkZEJ1dHRvbkNvbnRyb2xzKGNvbXBvbmVudENvbnRyb2xzRWxlbWVudCwgYnV0dG9uSW5kZXgpIHtcbiAgY29uc3QgYnV0dG9uQ29udHJvbHNFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGJ1dHRvbkNvbnRyb2xzRWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2NvbXBvbmVudENvbnRyb2xzJyk7XG5cbiAgYnV0dG9uQ29udHJvbHNFbGVtZW50LmlubmVySFRNTCArPSBgXG4gIDxsYWJlbD5idXR0b25WYWx1ZTwvbGFiZWw+XG4gIDxpbnB1dCBpZD1cImJ1dHRvbnNbJHtidXR0b25JbmRleH1dLnZhbHVlXCIgZGF0YS1pbmRleD1cIiR7YnV0dG9uSW5kZXh9XCIgdHlwZT1cInJhbmdlXCIgbWluPVwiMFwiIG1heD1cIjFcIiBzdGVwPVwiMC4wMVwiIHZhbHVlPVwiMFwiPlxuICBgO1xuXG4gIGNvbXBvbmVudENvbnRyb2xzRWxlbWVudC5hcHBlbmRDaGlsZChidXR0b25Db250cm9sc0VsZW1lbnQpO1xuXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGBidXR0b25zWyR7YnV0dG9uSW5kZXh9XS52YWx1ZWApLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0Jywgb25CdXR0b25WYWx1ZUNoYW5nZSk7XG59XG5cbmZ1bmN0aW9uIGFkZEF4aXNDb250cm9scyhjb21wb25lbnRDb250cm9sc0VsZW1lbnQsIGF4aXNOYW1lLCBheGlzSW5kZXgpIHtcbiAgY29uc3QgYXhpc0NvbnRyb2xzRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBheGlzQ29udHJvbHNFbGVtZW50LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnY29tcG9uZW50Q29udHJvbHMnKTtcblxuICBheGlzQ29udHJvbHNFbGVtZW50LmlubmVySFRNTCArPSBgXG4gIDxsYWJlbD4ke2F4aXNOYW1lfTxsYWJlbD5cbiAgPGlucHV0IGlkPVwiYXhlc1ske2F4aXNJbmRleH1dXCIgZGF0YS1pbmRleD1cIiR7YXhpc0luZGV4fVwiXG4gICAgICAgICAgdHlwZT1cInJhbmdlXCIgbWluPVwiLTFcIiBtYXg9XCIxXCIgc3RlcD1cIjAuMDFcIiB2YWx1ZT1cIjBcIj5cbiAgYDtcblxuICBjb21wb25lbnRDb250cm9sc0VsZW1lbnQuYXBwZW5kQ2hpbGQoYXhpc0NvbnRyb2xzRWxlbWVudCk7XG5cbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYGF4ZXNbJHtheGlzSW5kZXh9XWApLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0Jywgb25BeGlzVmFsdWVDaGFuZ2UpO1xufVxuXG5mdW5jdGlvbiBidWlsZChzb3VyY2VNb3Rpb25Db250cm9sbGVyKSB7XG4gIGNsZWFyKCk7XG5cbiAgbW90aW9uQ29udHJvbGxlciA9IHNvdXJjZU1vdGlvbkNvbnRyb2xsZXI7XG4gIG1vY2tHYW1lcGFkID0gbW90aW9uQ29udHJvbGxlci54cklucHV0U291cmNlLmdhbWVwYWQ7XG5cbiAgT2JqZWN0LnZhbHVlcyhtb3Rpb25Db250cm9sbGVyLmNvbXBvbmVudHMpLmZvckVhY2goKGNvbXBvbmVudCkgPT4ge1xuICAgIGNvbnN0IGNvbXBvbmVudENvbnRyb2xzRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG4gICAgY29tcG9uZW50Q29udHJvbHNFbGVtZW50LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnY29tcG9uZW50Jyk7XG4gICAgY29udHJvbHNMaXN0RWxlbWVudC5hcHBlbmRDaGlsZChjb21wb25lbnRDb250cm9sc0VsZW1lbnQpO1xuXG4gICAgY29uc3QgaGVhZGluZ0VsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdoNCcpO1xuICAgIGhlYWRpbmdFbGVtZW50LmlubmVyVGV4dCA9IGAke2NvbXBvbmVudC5pZH1gO1xuICAgIGNvbXBvbmVudENvbnRyb2xzRWxlbWVudC5hcHBlbmRDaGlsZChoZWFkaW5nRWxlbWVudCk7XG5cbiAgICBpZiAoY29tcG9uZW50LmdhbWVwYWRJbmRpY2VzLmJ1dHRvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBhZGRCdXR0b25Db250cm9scyhjb21wb25lbnRDb250cm9sc0VsZW1lbnQsIGNvbXBvbmVudC5nYW1lcGFkSW5kaWNlcy5idXR0b24pO1xuICAgIH1cblxuICAgIGlmIChjb21wb25lbnQuZ2FtZXBhZEluZGljZXMueEF4aXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgYWRkQXhpc0NvbnRyb2xzKGNvbXBvbmVudENvbnRyb2xzRWxlbWVudCwgJ3hBeGlzJywgY29tcG9uZW50LmdhbWVwYWRJbmRpY2VzLnhBeGlzKTtcbiAgICB9XG5cbiAgICBpZiAoY29tcG9uZW50LmdhbWVwYWRJbmRpY2VzLnlBeGlzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGFkZEF4aXNDb250cm9scyhjb21wb25lbnRDb250cm9sc0VsZW1lbnQsICd5QXhpcycsIGNvbXBvbmVudC5nYW1lcGFkSW5kaWNlcy55QXhpcyk7XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwcmUnKTtcbiAgICBkYXRhRWxlbWVudC5pZCA9IGAke2NvbXBvbmVudC5pZH1fZGF0YWA7XG4gICAgY29tcG9uZW50Q29udHJvbHNFbGVtZW50LmFwcGVuZENoaWxkKGRhdGFFbGVtZW50KTtcbiAgfSk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHsgY2xlYXIsIGJ1aWxkLCB1cGRhdGVUZXh0IH07XG4iLCJsZXQgZXJyb3JzU2VjdGlvbkVsZW1lbnQ7XG5sZXQgZXJyb3JzTGlzdEVsZW1lbnQ7XG5jbGFzcyBBc3NldEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvciguLi5wYXJhbXMpIHtcbiAgICBzdXBlciguLi5wYXJhbXMpO1xuICAgIEFzc2V0RXJyb3IubG9nKHRoaXMubWVzc2FnZSk7XG4gIH1cblxuICBzdGF0aWMgaW5pdGlhbGl6ZSgpIHtcbiAgICBlcnJvcnNMaXN0RWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdlcnJvcnMnKTtcbiAgICBlcnJvcnNTZWN0aW9uRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdlcnJvcnMnKTtcbiAgfVxuXG4gIHN0YXRpYyBsb2coZXJyb3JNZXNzYWdlKSB7XG4gICAgY29uc3QgaXRlbUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xuICAgIGl0ZW1FbGVtZW50LmlubmVyVGV4dCA9IGVycm9yTWVzc2FnZTtcbiAgICBlcnJvcnNMaXN0RWxlbWVudC5hcHBlbmRDaGlsZChpdGVtRWxlbWVudCk7XG4gICAgZXJyb3JzU2VjdGlvbkVsZW1lbnQuaGlkZGVuID0gZmFsc2U7XG4gIH1cblxuICBzdGF0aWMgY2xlYXJBbGwoKSB7XG4gICAgZXJyb3JzTGlzdEVsZW1lbnQuaW5uZXJIVE1MID0gJyc7XG4gICAgZXJyb3JzU2VjdGlvbkVsZW1lbnQuaGlkZGVuID0gdHJ1ZTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBBc3NldEVycm9yO1xuIiwiLyogZXNsaW50LWRpc2FibGUgaW1wb3J0L25vLXVucmVzb2x2ZWQgKi9cbmltcG9ydCAqIGFzIFRIUkVFIGZyb20gJy4vdGhyZWUvYnVpbGQvdGhyZWUubW9kdWxlLmpzJztcbmltcG9ydCB7IEdMVEZMb2FkZXIgfSBmcm9tICcuL3RocmVlL2V4YW1wbGVzL2pzbS9sb2FkZXJzL0dMVEZMb2FkZXIuanMnO1xuaW1wb3J0IHsgQ29uc3RhbnRzIH0gZnJvbSAnLi9tb3Rpb24tY29udHJvbGxlcnMubW9kdWxlLmpzJztcbi8qIGVzbGludC1lbmFibGUgKi9cblxuaW1wb3J0IEFzc2V0RXJyb3IgZnJvbSAnLi9hc3NldEVycm9yLmpzJztcblxuY29uc3QgZ2x0ZkxvYWRlciA9IG5ldyBHTFRGTG9hZGVyKCk7XG5cbmNsYXNzIENvbnRyb2xsZXJNb2RlbCBleHRlbmRzIFRIUkVFLk9iamVjdDNEIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLnhySW5wdXRTb3VyY2UgPSBudWxsO1xuICAgIHRoaXMubW90aW9uQ29udHJvbGxlciA9IG51bGw7XG4gICAgdGhpcy5hc3NldCA9IG51bGw7XG4gICAgdGhpcy5yb290Tm9kZSA9IG51bGw7XG4gICAgdGhpcy5ub2RlcyA9IHt9O1xuICAgIHRoaXMubG9hZGVkID0gZmFsc2U7XG4gICAgdGhpcy5lbnZNYXAgPSBudWxsO1xuICB9XG5cbiAgc2V0IGVudmlyb25tZW50TWFwKHZhbHVlKSB7XG4gICAgaWYgKHRoaXMuZW52TWFwID09PSB2YWx1ZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuZW52TWFwID0gdmFsdWU7XG4gICAgLyogZXNsaW50LWRpc2FibGUgbm8tcGFyYW0tcmVhc3NpZ24gKi9cbiAgICB0aGlzLnRyYXZlcnNlKChjaGlsZCkgPT4ge1xuICAgICAgaWYgKGNoaWxkLmlzTWVzaCkge1xuICAgICAgICBjaGlsZC5tYXRlcmlhbC5lbnZNYXAgPSB0aGlzLmVudk1hcDtcbiAgICAgICAgY2hpbGQubWF0ZXJpYWwubmVlZHNVcGRhdGUgPSB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuICAgIC8qIGVzbGludC1lbmFibGUgKi9cbiAgfVxuXG4gIGdldCBlbnZpcm9ubWVudE1hcCgpIHtcbiAgICByZXR1cm4gdGhpcy5lbnZNYXA7XG4gIH1cblxuICBhc3luYyBpbml0aWFsaXplKG1vdGlvbkNvbnRyb2xsZXIpIHtcbiAgICB0aGlzLm1vdGlvbkNvbnRyb2xsZXIgPSBtb3Rpb25Db250cm9sbGVyO1xuICAgIHRoaXMueHJJbnB1dFNvdXJjZSA9IHRoaXMubW90aW9uQ29udHJvbGxlci54cklucHV0U291cmNlO1xuXG4gICAgLy8gRmV0Y2ggdGhlIGFzc2V0cyBhbmQgZ2VuZXJhdGUgdGhyZWVqcyBvYmplY3RzIGZvciBpdFxuICAgIHRoaXMuYXNzZXQgPSBhd2FpdCBuZXcgUHJvbWlzZSgoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgZ2x0ZkxvYWRlci5sb2FkKFxuICAgICAgICBtb3Rpb25Db250cm9sbGVyLmFzc2V0VXJsLFxuICAgICAgICAobG9hZGVkQXNzZXQpID0+IHsgcmVzb2x2ZShsb2FkZWRBc3NldCk7IH0sXG4gICAgICAgIG51bGwsXG4gICAgICAgICgpID0+IHsgcmVqZWN0KG5ldyBBc3NldEVycm9yKGBBc3NldCAke21vdGlvbkNvbnRyb2xsZXIuYXNzZXRVcmx9IG1pc3Npbmcgb3IgbWFsZm9ybWVkLmApKTsgfVxuICAgICAgKTtcbiAgICB9KSk7XG5cbiAgICBpZiAodGhpcy5lbnZNYXApIHtcbiAgICAgIC8qIGVzbGludC1kaXNhYmxlIG5vLXBhcmFtLXJlYXNzaWduICovXG4gICAgICB0aGlzLmFzc2V0LnNjZW5lLnRyYXZlcnNlKChjaGlsZCkgPT4ge1xuICAgICAgICBpZiAoY2hpbGQuaXNNZXNoKSB7XG4gICAgICAgICAgY2hpbGQubWF0ZXJpYWwuZW52TWFwID0gdGhpcy5lbnZNYXA7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgLyogZXNsaW50LWVuYWJsZSAqL1xuICAgIH1cblxuICAgIHRoaXMucm9vdE5vZGUgPSB0aGlzLmFzc2V0LnNjZW5lO1xuICAgIHRoaXMuYWRkVG91Y2hEb3RzKCk7XG4gICAgdGhpcy5maW5kTm9kZXMoKTtcbiAgICB0aGlzLmFkZCh0aGlzLnJvb3ROb2RlKTtcbiAgICB0aGlzLmxvYWRlZCA9IHRydWU7XG4gIH1cblxuICAvKipcbiAgICogUG9sbHMgZGF0YSBmcm9tIHRoZSBYUklucHV0U291cmNlIGFuZCB1cGRhdGVzIHRoZSBtb2RlbCdzIGNvbXBvbmVudHMgdG8gbWF0Y2hcbiAgICogdGhlIHJlYWwgd29ybGQgZGF0YVxuICAgKi9cbiAgdXBkYXRlTWF0cml4V29ybGQoZm9yY2UpIHtcbiAgICBzdXBlci51cGRhdGVNYXRyaXhXb3JsZChmb3JjZSk7XG5cbiAgICBpZiAoIXRoaXMubG9hZGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gQ2F1c2UgdGhlIE1vdGlvbkNvbnRyb2xsZXIgdG8gcG9sbCB0aGUgR2FtZXBhZCBmb3IgZGF0YVxuICAgIHRoaXMubW90aW9uQ29udHJvbGxlci51cGRhdGVGcm9tR2FtZXBhZCgpO1xuXG4gICAgLy8gVXBkYXRlIHRoZSAzRCBtb2RlbCB0byByZWZsZWN0IHRoZSBidXR0b24sIHRodW1ic3RpY2ssIGFuZCB0b3VjaHBhZCBzdGF0ZVxuICAgIE9iamVjdC52YWx1ZXModGhpcy5tb3Rpb25Db250cm9sbGVyLmNvbXBvbmVudHMpLmZvckVhY2goKGNvbXBvbmVudCkgPT4ge1xuICAgICAgLy8gVXBkYXRlIG5vZGUgZGF0YSBiYXNlZCBvbiB0aGUgdmlzdWFsIHJlc3BvbnNlcycgY3VycmVudCBzdGF0ZXNcbiAgICAgIE9iamVjdC52YWx1ZXMoY29tcG9uZW50LnZpc3VhbFJlc3BvbnNlcykuZm9yRWFjaCgodmlzdWFsUmVzcG9uc2UpID0+IHtcbiAgICAgICAgY29uc3Qge1xuICAgICAgICAgIHZhbHVlTm9kZU5hbWUsIG1pbk5vZGVOYW1lLCBtYXhOb2RlTmFtZSwgdmFsdWUsIHZhbHVlTm9kZVByb3BlcnR5XG4gICAgICAgIH0gPSB2aXN1YWxSZXNwb25zZTtcbiAgICAgICAgY29uc3QgdmFsdWVOb2RlID0gdGhpcy5ub2Rlc1t2YWx1ZU5vZGVOYW1lXTtcblxuICAgICAgICAvLyBTa2lwIGlmIHRoZSB2aXN1YWwgcmVzcG9uc2Ugbm9kZSBpcyBub3QgZm91bmQuIE5vIGVycm9yIGlzIG5lZWRlZCxcbiAgICAgICAgLy8gYmVjYXVzZSBpdCB3aWxsIGhhdmUgYmVlbiByZXBvcnRlZCBhdCBsb2FkIHRpbWUuXG4gICAgICAgIGlmICghdmFsdWVOb2RlKSByZXR1cm47XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIHRoZSBuZXcgcHJvcGVydGllcyBiYXNlZCBvbiB0aGUgd2VpZ2h0IHN1cHBsaWVkXG4gICAgICAgIGlmICh2YWx1ZU5vZGVQcm9wZXJ0eSA9PT0gQ29uc3RhbnRzLlZpc3VhbFJlc3BvbnNlUHJvcGVydHkuVklTSUJJTElUWSkge1xuICAgICAgICAgIHZhbHVlTm9kZS52aXNpYmxlID0gdmFsdWU7XG4gICAgICAgIH0gZWxzZSBpZiAodmFsdWVOb2RlUHJvcGVydHkgPT09IENvbnN0YW50cy5WaXN1YWxSZXNwb25zZVByb3BlcnR5LlRSQU5TRk9STSkge1xuICAgICAgICAgIGNvbnN0IG1pbk5vZGUgPSB0aGlzLm5vZGVzW21pbk5vZGVOYW1lXTtcbiAgICAgICAgICBjb25zdCBtYXhOb2RlID0gdGhpcy5ub2Rlc1ttYXhOb2RlTmFtZV07XG4gICAgICAgICAgdmFsdWVOb2RlLnF1YXRlcm5pb24uc2xlcnBRdWF0ZXJuaW9ucyhcbiAgICAgICAgICAgIG1pbk5vZGUucXVhdGVybmlvbixcbiAgICAgICAgICAgIG1heE5vZGUucXVhdGVybmlvbixcbiAgICAgICAgICAgIHZhbHVlXG4gICAgICAgICAgKTtcblxuICAgICAgICAgIHZhbHVlTm9kZS5wb3NpdGlvbi5sZXJwVmVjdG9ycyhcbiAgICAgICAgICAgIG1pbk5vZGUucG9zaXRpb24sXG4gICAgICAgICAgICBtYXhOb2RlLnBvc2l0aW9uLFxuICAgICAgICAgICAgdmFsdWVcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBXYWxrcyB0aGUgbW9kZWwncyB0cmVlIHRvIGZpbmQgdGhlIG5vZGVzIG5lZWRlZCB0byBhbmltYXRlIHRoZSBjb21wb25lbnRzIGFuZFxuICAgKiBzYXZlcyB0aGVtIGZvciB1c2UgaW4gdGhlIGZyYW1lIGxvb3BcbiAgICovXG4gIGZpbmROb2RlcygpIHtcbiAgICB0aGlzLm5vZGVzID0ge307XG5cbiAgICAvLyBMb29wIHRocm91Z2ggdGhlIGNvbXBvbmVudHMgYW5kIGZpbmQgdGhlIG5vZGVzIG5lZWRlZCBmb3IgZWFjaCBjb21wb25lbnRzJyB2aXN1YWwgcmVzcG9uc2VzXG4gICAgT2JqZWN0LnZhbHVlcyh0aGlzLm1vdGlvbkNvbnRyb2xsZXIuY29tcG9uZW50cykuZm9yRWFjaCgoY29tcG9uZW50KSA9PiB7XG4gICAgICBjb25zdCB7IHRvdWNoUG9pbnROb2RlTmFtZSwgdmlzdWFsUmVzcG9uc2VzIH0gPSBjb21wb25lbnQ7XG4gICAgICBpZiAodG91Y2hQb2ludE5vZGVOYW1lKSB7XG4gICAgICAgIHRoaXMubm9kZXNbdG91Y2hQb2ludE5vZGVOYW1lXSA9IHRoaXMucm9vdE5vZGUuZ2V0T2JqZWN0QnlOYW1lKHRvdWNoUG9pbnROb2RlTmFtZSk7XG4gICAgICB9XG5cbiAgICAgIC8vIExvb3AgdGhyb3VnaCBhbGwgdGhlIHZpc3VhbCByZXNwb25zZXMgdG8gYmUgYXBwbGllZCB0byB0aGlzIGNvbXBvbmVudFxuICAgICAgT2JqZWN0LnZhbHVlcyh2aXN1YWxSZXNwb25zZXMpLmZvckVhY2goKHZpc3VhbFJlc3BvbnNlKSA9PiB7XG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICB2YWx1ZU5vZGVOYW1lLCBtaW5Ob2RlTmFtZSwgbWF4Tm9kZU5hbWUsIHZhbHVlTm9kZVByb3BlcnR5XG4gICAgICAgIH0gPSB2aXN1YWxSZXNwb25zZTtcbiAgICAgICAgLy8gSWYgYW5pbWF0aW5nIGEgdHJhbnNmb3JtLCBmaW5kIHRoZSB0d28gbm9kZXMgdG8gYmUgaW50ZXJwb2xhdGVkIGJldHdlZW4uXG4gICAgICAgIGlmICh2YWx1ZU5vZGVQcm9wZXJ0eSA9PT0gQ29uc3RhbnRzLlZpc3VhbFJlc3BvbnNlUHJvcGVydHkuVFJBTlNGT1JNKSB7XG4gICAgICAgICAgdGhpcy5ub2Rlc1ttaW5Ob2RlTmFtZV0gPSB0aGlzLnJvb3ROb2RlLmdldE9iamVjdEJ5TmFtZShtaW5Ob2RlTmFtZSk7XG4gICAgICAgICAgdGhpcy5ub2Rlc1ttYXhOb2RlTmFtZV0gPSB0aGlzLnJvb3ROb2RlLmdldE9iamVjdEJ5TmFtZShtYXhOb2RlTmFtZSk7XG5cbiAgICAgICAgICAvLyBJZiB0aGUgZXh0ZW50cyBjYW5ub3QgYmUgZm91bmQsIHNraXAgdGhpcyBhbmltYXRpb25cbiAgICAgICAgICBpZiAoIXRoaXMubm9kZXNbbWluTm9kZU5hbWVdKSB7XG4gICAgICAgICAgICBBc3NldEVycm9yLmxvZyhgQ291bGQgbm90IGZpbmQgJHttaW5Ob2RlTmFtZX0gaW4gdGhlIG1vZGVsYCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghdGhpcy5ub2Rlc1ttYXhOb2RlTmFtZV0pIHtcbiAgICAgICAgICAgIEFzc2V0RXJyb3IubG9nKGBDb3VsZCBub3QgZmluZCAke21heE5vZGVOYW1lfSBpbiB0aGUgbW9kZWxgKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiB0aGUgdGFyZ2V0IG5vZGUgY2Fubm90IGJlIGZvdW5kLCBza2lwIHRoaXMgYW5pbWF0aW9uXG4gICAgICAgIHRoaXMubm9kZXNbdmFsdWVOb2RlTmFtZV0gPSB0aGlzLnJvb3ROb2RlLmdldE9iamVjdEJ5TmFtZSh2YWx1ZU5vZGVOYW1lKTtcbiAgICAgICAgaWYgKCF0aGlzLm5vZGVzW3ZhbHVlTm9kZU5hbWVdKSB7XG4gICAgICAgICAgQXNzZXRFcnJvci5sb2coYENvdWxkIG5vdCBmaW5kICR7dmFsdWVOb2RlTmFtZX0gaW4gdGhlIG1vZGVsYCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCB0b3VjaCBkb3RzIHRvIGFsbCB0b3VjaHBhZCBjb21wb25lbnRzIHNvIHRoZSBmaW5nZXIgY2FuIGJlIHNlZW5cbiAgICovXG4gIGFkZFRvdWNoRG90cygpIHtcbiAgICBPYmplY3Qua2V5cyh0aGlzLm1vdGlvbkNvbnRyb2xsZXIuY29tcG9uZW50cykuZm9yRWFjaCgoY29tcG9uZW50SWQpID0+IHtcbiAgICAgIGNvbnN0IGNvbXBvbmVudCA9IHRoaXMubW90aW9uQ29udHJvbGxlci5jb21wb25lbnRzW2NvbXBvbmVudElkXTtcbiAgICAgIC8vIEZpbmQgdGhlIHRvdWNocGFkc1xuICAgICAgaWYgKGNvbXBvbmVudC50eXBlID09PSBDb25zdGFudHMuQ29tcG9uZW50VHlwZS5UT1VDSFBBRCkge1xuICAgICAgICAvLyBGaW5kIHRoZSBub2RlIHRvIGF0dGFjaCB0aGUgdG91Y2ggZG90LlxuICAgICAgICBjb25zdCB0b3VjaFBvaW50Um9vdCA9IHRoaXMucm9vdE5vZGUuZ2V0T2JqZWN0QnlOYW1lKGNvbXBvbmVudC50b3VjaFBvaW50Tm9kZU5hbWUsIHRydWUpO1xuICAgICAgICBpZiAoIXRvdWNoUG9pbnRSb290KSB7XG4gICAgICAgICAgQXNzZXRFcnJvci5sb2coYENvdWxkIG5vdCBmaW5kIHRvdWNoIGRvdCwgJHtjb21wb25lbnQudG91Y2hQb2ludE5vZGVOYW1lfSwgaW4gdG91Y2hwYWQgY29tcG9uZW50ICR7Y29tcG9uZW50SWR9YCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3Qgc3BoZXJlR2VvbWV0cnkgPSBuZXcgVEhSRUUuU3BoZXJlR2VvbWV0cnkoMC4wMDEpO1xuICAgICAgICAgIGNvbnN0IG1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHsgY29sb3I6IDB4MDAwMEZGIH0pO1xuICAgICAgICAgIGNvbnN0IHNwaGVyZSA9IG5ldyBUSFJFRS5NZXNoKHNwaGVyZUdlb21ldHJ5LCBtYXRlcmlhbCk7XG4gICAgICAgICAgdG91Y2hQb2ludFJvb3QuYWRkKHNwaGVyZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBDb250cm9sbGVyTW9kZWw7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBpbXBvcnQvbm8tdW5yZXNvbHZlZCAqL1xuaW1wb3J0ICcuL2Fqdi9hanYubWluLmpzJztcbmltcG9ydCB2YWxpZGF0ZVJlZ2lzdHJ5UHJvZmlsZSBmcm9tICcuL3JlZ2lzdHJ5VG9vbHMvdmFsaWRhdGVSZWdpc3RyeVByb2ZpbGUuanMnO1xuaW1wb3J0IGV4cGFuZFJlZ2lzdHJ5UHJvZmlsZSBmcm9tICcuL2Fzc2V0VG9vbHMvZXhwYW5kUmVnaXN0cnlQcm9maWxlLmpzJztcbmltcG9ydCBidWlsZEFzc2V0UHJvZmlsZSBmcm9tICcuL2Fzc2V0VG9vbHMvYnVpbGRBc3NldFByb2ZpbGUuanMnO1xuLyogZXNsaW50LWVuYWJsZSAqL1xuXG5pbXBvcnQgQXNzZXRFcnJvciBmcm9tICcuL2Fzc2V0RXJyb3IuanMnO1xuXG4vKipcbiAqIExvYWRzIGEgcHJvZmlsZSBmcm9tIGEgc2V0IG9mIGxvY2FsIGZpbGVzXG4gKi9cbmNsYXNzIExvY2FsUHJvZmlsZSBleHRlbmRzIEV2ZW50VGFyZ2V0IHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoKTtcblxuICAgIHRoaXMubG9jYWxGaWxlc0xpc3RFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xvY2FsRmlsZXNMaXN0Jyk7XG4gICAgdGhpcy5maWxlc1NlbGVjdG9yID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xvY2FsRmlsZXNTZWxlY3RvcicpO1xuICAgIHRoaXMuZmlsZXNTZWxlY3Rvci5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICB0aGlzLm9uRmlsZXNTZWxlY3RlZCgpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5jbGVhcigpO1xuXG4gICAgTG9jYWxQcm9maWxlLmJ1aWxkU2NoZW1hVmFsaWRhdG9yKCdyZWdpc3RyeVRvb2xzL3JlZ2lzdHJ5U2NoZW1hcy5qc29uJykudGhlbigocmVnaXN0cnlTY2hlbWFWYWxpZGF0b3IpID0+IHtcbiAgICAgIHRoaXMucmVnaXN0cnlTY2hlbWFWYWxpZGF0b3IgPSByZWdpc3RyeVNjaGVtYVZhbGlkYXRvcjtcbiAgICAgIExvY2FsUHJvZmlsZS5idWlsZFNjaGVtYVZhbGlkYXRvcignYXNzZXRUb29scy9hc3NldFNjaGVtYXMuanNvbicpLnRoZW4oKGFzc2V0U2NoZW1hVmFsaWRhdG9yKSA9PiB7XG4gICAgICAgIHRoaXMuYXNzZXRTY2hlbWFWYWxpZGF0b3IgPSBhc3NldFNjaGVtYVZhbGlkYXRvcjtcbiAgICAgICAgY29uc3QgZHVyaW5nUGFnZUxvYWQgPSB0cnVlO1xuICAgICAgICB0aGlzLm9uRmlsZXNTZWxlY3RlZChkdXJpbmdQYWdlTG9hZCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbGVhcnMgYWxsIGxvY2FsIHByb2ZpbGUgaW5mb3JtYXRpb25cbiAgICovXG4gIGNsZWFyKCkge1xuICAgIGlmICh0aGlzLnByb2ZpbGUpIHtcbiAgICAgIHRoaXMucHJvZmlsZSA9IG51bGw7XG4gICAgICB0aGlzLnByb2ZpbGVJZCA9IG51bGw7XG4gICAgICB0aGlzLmFzc2V0cyA9IFtdO1xuICAgICAgdGhpcy5sb2NhbEZpbGVzTGlzdEVsZW1lbnQuaW5uZXJIVE1MID0gJyc7XG5cbiAgICAgIGNvbnN0IGNoYW5nZUV2ZW50ID0gbmV3IEV2ZW50KCdsb2NhbFByb2ZpbGVDaGFuZ2UnKTtcbiAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChjaGFuZ2VFdmVudCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFByb2Nlc3NlcyBzZWxlY3RlZCBmaWxlcyBhbmQgZ2VuZXJhdGVzIGFuIGFzc2V0IHByb2ZpbGVcbiAgICogQHBhcmFtIHtib29sZWFufSBkdXJpbmdQYWdlTG9hZFxuICAgKi9cbiAgYXN5bmMgb25GaWxlc1NlbGVjdGVkKGR1cmluZ1BhZ2VMb2FkKSB7XG4gICAgdGhpcy5jbGVhcigpO1xuXG4gICAgLy8gU2tpcCBpZiBpbml0aWFsemF0aW9uIGlzIGluY29tcGxldGVcbiAgICBpZiAoIXRoaXMuYXNzZXRTY2hlbWFWYWxpZGF0b3IpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBFeGFtaW5lIHRoZSBmaWxlcyBzZWxlY3RlZCB0byBmaW5kIHRoZSByZWdpc3RyeSBwcm9maWxlLCBhc3NldCBvdmVycmlkZXMsIGFuZCBhc3NldCBmaWxlc1xuICAgIGNvbnN0IGFzc2V0cyA9IFtdO1xuICAgIGxldCBhc3NldEpzb25GaWxlO1xuICAgIGxldCByZWdpc3RyeUpzb25GaWxlO1xuXG4gICAgY29uc3QgZmlsZXNMaXN0ID0gQXJyYXkuZnJvbSh0aGlzLmZpbGVzU2VsZWN0b3IuZmlsZXMpO1xuICAgIGZpbGVzTGlzdC5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICBpZiAoZmlsZS5uYW1lLmVuZHNXaXRoKCcuZ2xiJykpIHtcbiAgICAgICAgYXNzZXRzW2ZpbGUubmFtZV0gPSB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTChmaWxlKTtcbiAgICAgIH0gZWxzZSBpZiAoZmlsZS5uYW1lID09PSAncHJvZmlsZS5qc29uJykge1xuICAgICAgICBhc3NldEpzb25GaWxlID0gZmlsZTtcbiAgICAgIH0gZWxzZSBpZiAoZmlsZS5uYW1lLmVuZHNXaXRoKCcuanNvbicpKSB7XG4gICAgICAgIHJlZ2lzdHJ5SnNvbkZpbGUgPSBmaWxlO1xuICAgICAgfVxuXG4gICAgICAvLyBMaXN0IHRoZSBmaWxlcyBmb3VuZFxuICAgICAgdGhpcy5sb2NhbEZpbGVzTGlzdEVsZW1lbnQuaW5uZXJIVE1MICs9IGBcbiAgICAgICAgPGxpPiR7ZmlsZS5uYW1lfTwvbGk+XG4gICAgICBgO1xuICAgIH0pO1xuXG4gICAgaWYgKCFyZWdpc3RyeUpzb25GaWxlKSB7XG4gICAgICBBc3NldEVycm9yLmxvZygnTm8gcmVnaXN0cnkgcHJvZmlsZSBzZWxlY3RlZCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMuYnVpbGRQcm9maWxlKHJlZ2lzdHJ5SnNvbkZpbGUsIGFzc2V0SnNvbkZpbGUsIGFzc2V0cyk7XG4gICAgdGhpcy5hc3NldHMgPSBhc3NldHM7XG5cbiAgICAvLyBDaGFuZ2UgdGhlIHNlbGVjdGVkIHByb2ZpbGUgdG8gdGhlIG9uZSBqdXN0IGxvYWRlZC4gIERvIG5vdCBkbyB0aGlzIG9uIGluaXRpYWwgcGFnZSBsb2FkXG4gICAgLy8gYmVjYXVzZSB0aGUgc2VsZWN0ZWQgZmlsZXMgcGVyc2lzdHMgaW4gZmlyZWZveCBhY3Jvc3MgcmVmcmVzaGVzLCBidXQgdGhlIHVzZXIgbWF5IGhhdmVcbiAgICAvLyBzZWxlY3RlZCBhIGRpZmZlcmVudCBpdGVtIGZyb20gdGhlIGRyb3Bkb3duXG4gICAgaWYgKCFkdXJpbmdQYWdlTG9hZCkge1xuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKCdwcm9maWxlSWQnLCB0aGlzLnByb2ZpbGVJZCk7XG4gICAgfVxuXG4gICAgLy8gTm90aWZ5IHRoYXQgdGhlIGxvY2FsIHByb2ZpbGUgaXMgcmVhZHkgZm9yIHVzZVxuICAgIGNvbnN0IGNoYW5nZUV2ZW50ID0gbmV3IEV2ZW50KCdsb2NhbHByb2ZpbGVjaGFuZ2UnKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQoY2hhbmdlRXZlbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEJ1aWxkIGEgbWVyZ2VkIHByb2ZpbGUgZmlsZSBmcm9tIHRoZSByZWdpc3RyeSBwcm9maWxlIGFuZCBhc3NldCBvdmVycmlkZXNcbiAgICogQHBhcmFtIHsqfSByZWdpc3RyeUpzb25GaWxlXG4gICAqIEBwYXJhbSB7Kn0gYXNzZXRKc29uRmlsZVxuICAgKi9cbiAgYXN5bmMgYnVpbGRQcm9maWxlKHJlZ2lzdHJ5SnNvbkZpbGUsIGFzc2V0SnNvbkZpbGUpIHtcbiAgICAvLyBMb2FkIHRoZSByZWdpc3RyeSBKU09OIGFuZCB2YWxpZGF0ZSBpdCBhZ2FpbnN0IHRoZSBzY2hlbWFcbiAgICBjb25zdCByZWdpc3RyeUpzb24gPSBhd2FpdCBMb2NhbFByb2ZpbGUubG9hZExvY2FsSnNvbihyZWdpc3RyeUpzb25GaWxlKTtcbiAgICBjb25zdCBpc1JlZ2lzdHJ5SnNvblZhbGlkID0gdGhpcy5yZWdpc3RyeVNjaGVtYVZhbGlkYXRvcihyZWdpc3RyeUpzb24pO1xuICAgIGlmICghaXNSZWdpc3RyeUpzb25WYWxpZCkge1xuICAgICAgdGhyb3cgbmV3IEFzc2V0RXJyb3IoSlNPTi5zdHJpbmdpZnkodGhpcy5yZWdpc3RyeVNjaGVtYVZhbGlkYXRvci5lcnJvcnMsIG51bGwsIDIpKTtcbiAgICB9XG5cbiAgICAvLyBMb2FkIHRoZSBhc3NldCBKU09OIGFuZCB2YWxpZGF0ZSBpdCBhZ2FpbnN0IHRoZSBzY2hlbWEuXG4gICAgLy8gSWYgbm8gYXNzZXQgSlNPTiBwcmVzZW50LCB1c2UgdGhlIGRlZmF1bHQgZGVmaW5pdG9uXG4gICAgbGV0IGFzc2V0SnNvbjtcbiAgICBpZiAoIWFzc2V0SnNvbkZpbGUpIHtcbiAgICAgIGFzc2V0SnNvbiA9IHsgcHJvZmlsZUlkOiByZWdpc3RyeUpzb24ucHJvZmlsZUlkLCBvdmVycmlkZXM6IHt9IH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGFzc2V0SnNvbiA9IGF3YWl0IExvY2FsUHJvZmlsZS5sb2FkTG9jYWxKc29uKGFzc2V0SnNvbkZpbGUpO1xuICAgICAgY29uc3QgaXNBc3NldEpzb25WYWxpZCA9IHRoaXMuYXNzZXRTY2hlbWFWYWxpZGF0b3IoYXNzZXRKc29uKTtcbiAgICAgIGlmICghaXNBc3NldEpzb25WYWxpZCkge1xuICAgICAgICB0aHJvdyBuZXcgQXNzZXRFcnJvcihKU09OLnN0cmluZ2lmeSh0aGlzLmFzc2V0U2NoZW1hVmFsaWRhdG9yLmVycm9ycywgbnVsbCwgMikpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFZhbGlkYXRlIG5vbi1zY2hlbWEgcmVxdWlyZW1lbnRzIGFuZCBidWlsZCBhIGNvbWJpbmVkIHByb2ZpbGVcbiAgICB2YWxpZGF0ZVJlZ2lzdHJ5UHJvZmlsZShyZWdpc3RyeUpzb24pO1xuICAgIGNvbnN0IGV4cGFuZGVkUmVnaXN0cnlQcm9maWxlID0gZXhwYW5kUmVnaXN0cnlQcm9maWxlKHJlZ2lzdHJ5SnNvbik7XG4gICAgdGhpcy5wcm9maWxlID0gYnVpbGRBc3NldFByb2ZpbGUoYXNzZXRKc29uLCBleHBhbmRlZFJlZ2lzdHJ5UHJvZmlsZSk7XG4gICAgdGhpcy5wcm9maWxlSWQgPSB0aGlzLnByb2ZpbGUucHJvZmlsZUlkO1xuICB9XG5cbiAgLyoqXG4gICAqIEhlbHBlciB0byBsb2FkIEpTT04gZnJvbSBhIGxvY2FsIGZpbGVcbiAgICogQHBhcmFtIHtGaWxlfSBqc29uRmlsZVxuICAgKi9cbiAgc3RhdGljIGxvYWRMb2NhbEpzb24oanNvbkZpbGUpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3QgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcblxuICAgICAgcmVhZGVyLm9ubG9hZCA9ICgpID0+IHtcbiAgICAgICAgY29uc3QganNvbiA9IEpTT04ucGFyc2UocmVhZGVyLnJlc3VsdCk7XG4gICAgICAgIHJlc29sdmUoanNvbik7XG4gICAgICB9O1xuXG4gICAgICByZWFkZXIub25lcnJvciA9ICgpID0+IHtcbiAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gYFVuYWJsZSB0byBsb2FkIEpTT04gZnJvbSAke2pzb25GaWxlLm5hbWV9YDtcbiAgICAgICAgQXNzZXRFcnJvci5sb2coZXJyb3JNZXNzYWdlKTtcbiAgICAgICAgcmVqZWN0KGVycm9yTWVzc2FnZSk7XG4gICAgICB9O1xuXG4gICAgICByZWFkZXIucmVhZEFzVGV4dChqc29uRmlsZSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogSGVscGVyIHRvIGxvYWQgdGhlIGNvbWJpbmVkIHNjaGVtYSBmaWxlIGFuZCBjb21waWxlIGFuIEFKViB2YWxpZGF0b3JcbiAgICogQHBhcmFtIHtzdHJpbmd9IHNjaGVtYXNQYXRoXG4gICAqL1xuICBzdGF0aWMgYXN5bmMgYnVpbGRTY2hlbWFWYWxpZGF0b3Ioc2NoZW1hc1BhdGgpIHtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHNjaGVtYXNQYXRoKTtcbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICB0aHJvdyBuZXcgQXNzZXRFcnJvcihyZXNwb25zZS5zdGF0dXNUZXh0KTtcbiAgICB9XG5cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdW5kZWZcbiAgICBjb25zdCBhanYgPSBuZXcgQWp2KCk7XG4gICAgY29uc3Qgc2NoZW1hcyA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICBzY2hlbWFzLmRlcGVuZGVuY2llcy5mb3JFYWNoKChzY2hlbWEpID0+IHtcbiAgICAgIGFqdi5hZGRTY2hlbWEoc2NoZW1hKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBhanYuY29tcGlsZShzY2hlbWFzLm1haW5TY2hlbWEpO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IExvY2FsUHJvZmlsZTtcbiIsIi8qIGVzbGludC1kaXNhYmxlIGltcG9ydC9uby11bnJlc29sdmVkICovXG5pbXBvcnQgeyBmZXRjaFByb2ZpbGUsIGZldGNoUHJvZmlsZXNMaXN0LCBNb3Rpb25Db250cm9sbGVyIH0gZnJvbSAnLi9tb3Rpb24tY29udHJvbGxlcnMubW9kdWxlLmpzJztcbi8qIGVzbGludC1lbmFibGUgKi9cblxuaW1wb3J0IEFzc2V0RXJyb3IgZnJvbSAnLi9hc3NldEVycm9yLmpzJztcbmltcG9ydCBMb2NhbFByb2ZpbGUgZnJvbSAnLi9sb2NhbFByb2ZpbGUuanMnO1xuXG5jb25zdCBwcm9maWxlc0Jhc2VQYXRoID0gJy4vcHJvZmlsZXMnO1xuXG4vKipcbiAqIExvYWRzIHByb2ZpbGVzIGZyb20gdGhlIGRpc3RyaWJ1dGlvbiBmb2xkZXIgbmV4dCB0byB0aGUgdmlld2VyJ3MgbG9jYXRpb25cbiAqL1xuY2xhc3MgUHJvZmlsZVNlbGVjdG9yIGV4dGVuZHMgRXZlbnRUYXJnZXQge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcigpO1xuXG4gICAgLy8gR2V0IHRoZSBwcm9maWxlIGlkIHNlbGVjdG9yIGFuZCBsaXN0ZW4gZm9yIGNoYW5nZXNcbiAgICB0aGlzLnByb2ZpbGVJZFNlbGVjdG9yRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcm9maWxlSWRTZWxlY3RvcicpO1xuICAgIHRoaXMucHJvZmlsZUlkU2VsZWN0b3JFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsICgpID0+IHsgdGhpcy5vblByb2ZpbGVJZENoYW5nZSgpOyB9KTtcblxuICAgIC8vIEdldCB0aGUgaGFuZGVkbmVzcyBzZWxlY3RvciBhbmQgbGlzdGVuIGZvciBjaGFuZ2VzXG4gICAgdGhpcy5oYW5kZWRuZXNzU2VsZWN0b3JFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2hhbmRlZG5lc3NTZWxlY3RvcicpO1xuICAgIHRoaXMuaGFuZGVkbmVzc1NlbGVjdG9yRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoKSA9PiB7IHRoaXMub25IYW5kZWRuZXNzQ2hhbmdlKCk7IH0pO1xuXG4gICAgdGhpcy5mb3JjZVZSUHJvZmlsZUVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZm9yY2VWUlByb2ZpbGUnKTtcbiAgICB0aGlzLnNob3dUYXJnZXRSYXlFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Nob3dUYXJnZXRSYXknKTtcblxuICAgIHRoaXMubG9jYWxQcm9maWxlID0gbmV3IExvY2FsUHJvZmlsZSgpO1xuICAgIHRoaXMubG9jYWxQcm9maWxlLmFkZEV2ZW50TGlzdGVuZXIoJ2xvY2FscHJvZmlsZWNoYW5nZScsIChldmVudCkgPT4geyB0aGlzLm9uTG9jYWxQcm9maWxlQ2hhbmdlKGV2ZW50KTsgfSk7XG5cbiAgICB0aGlzLnByb2ZpbGVzTGlzdCA9IG51bGw7XG4gICAgdGhpcy5wb3B1bGF0ZVByb2ZpbGVTZWxlY3RvcigpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlc2V0cyBhbGwgc2VsZWN0ZWQgcHJvZmlsZSBzdGF0ZVxuICAgKi9cbiAgY2xlYXJTZWxlY3RlZFByb2ZpbGUoKSB7XG4gICAgQXNzZXRFcnJvci5jbGVhckFsbCgpO1xuICAgIHRoaXMucHJvZmlsZSA9IG51bGw7XG4gICAgdGhpcy5oYW5kZWRuZXNzID0gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZXMgdGhlIGZ1bGwgbGlzdCBvZiBhdmFpbGFibGUgcHJvZmlsZXMgYW5kIHBvcHVsYXRlcyB0aGUgZHJvcGRvd25cbiAgICovXG4gIGFzeW5jIHBvcHVsYXRlUHJvZmlsZVNlbGVjdG9yKCkge1xuICAgIHRoaXMuY2xlYXJTZWxlY3RlZFByb2ZpbGUoKTtcbiAgICB0aGlzLmhhbmRlZG5lc3NTZWxlY3RvckVsZW1lbnQuaW5uZXJIVE1MID0gJyc7XG5cbiAgICAvLyBMb2FkIGFuZCBjbGVhciBsb2NhbCBzdG9yYWdlXG4gICAgY29uc3Qgc3RvcmVkUHJvZmlsZUlkID0gd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdwcm9maWxlSWQnKTtcbiAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ3Byb2ZpbGVJZCcpO1xuXG4gICAgLy8gTG9hZCB0aGUgbGlzdCBvZiBwcm9maWxlc1xuICAgIGlmICghdGhpcy5wcm9maWxlc0xpc3QpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHRoaXMucHJvZmlsZUlkU2VsZWN0b3JFbGVtZW50LmlubmVySFRNTCA9ICc8b3B0aW9uIHZhbHVlPVwibG9hZGluZ1wiPkxvYWRpbmcuLi48L29wdGlvbj4nO1xuICAgICAgICB0aGlzLnByb2ZpbGVzTGlzdCA9IGF3YWl0IGZldGNoUHJvZmlsZXNMaXN0KHByb2ZpbGVzQmFzZVBhdGgpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgdGhpcy5wcm9maWxlSWRTZWxlY3RvckVsZW1lbnQuaW5uZXJIVE1MID0gJ0ZhaWxlZCB0byBsb2FkIGxpc3QnO1xuICAgICAgICBBc3NldEVycm9yLmxvZyhlcnJvci5tZXNzYWdlKTtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWRkIGVhY2ggcHJvZmlsZSB0byB0aGUgZHJvcGRvd25cbiAgICB0aGlzLnByb2ZpbGVJZFNlbGVjdG9yRWxlbWVudC5pbm5lckhUTUwgPSAnJztcbiAgICBPYmplY3Qua2V5cyh0aGlzLnByb2ZpbGVzTGlzdCkuZm9yRWFjaCgocHJvZmlsZUlkKSA9PiB7XG4gICAgICBjb25zdCBwcm9maWxlID0gdGhpcy5wcm9maWxlc0xpc3RbcHJvZmlsZUlkXTtcbiAgICAgIGlmICghcHJvZmlsZS5kZXByZWNhdGVkKSB7XG4gICAgICAgIHRoaXMucHJvZmlsZUlkU2VsZWN0b3JFbGVtZW50LmlubmVySFRNTCArPSBgXG4gICAgICAgIDxvcHRpb24gdmFsdWU9JyR7cHJvZmlsZUlkfSc+JHtwcm9maWxlSWR9PC9vcHRpb24+XG4gICAgICAgIGA7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBBZGQgdGhlIGxvY2FsIHByb2ZpbGUgaWYgaXQgaXNuJ3QgYWxyZWFkeSBpbmNsdWRlZFxuICAgIGlmICh0aGlzLmxvY2FsUHJvZmlsZS5wcm9maWxlSWRcbiAgICAgJiYgIU9iamVjdC5rZXlzKHRoaXMucHJvZmlsZXNMaXN0KS5pbmNsdWRlcyh0aGlzLmxvY2FsUHJvZmlsZS5wcm9maWxlSWQpKSB7XG4gICAgICB0aGlzLnByb2ZpbGVJZFNlbGVjdG9yRWxlbWVudC5pbm5lckhUTUwgKz0gYFxuICAgICAgPG9wdGlvbiB2YWx1ZT0nJHt0aGlzLmxvY2FsUHJvZmlsZS5wcm9maWxlSWR9Jz4ke3RoaXMubG9jYWxQcm9maWxlLnByb2ZpbGVJZH08L29wdGlvbj5cbiAgICAgIGA7XG4gICAgICB0aGlzLnByb2ZpbGVzTGlzdFt0aGlzLmxvY2FsUHJvZmlsZS5wcm9maWxlSWRdID0gdGhpcy5sb2NhbFByb2ZpbGU7XG4gICAgfVxuXG4gICAgLy8gT3ZlcnJpZGUgdGhlIGRlZmF1bHQgc2VsZWN0aW9uIGlmIHZhbHVlcyB3ZXJlIHByZXNlbnQgaW4gbG9jYWwgc3RvcmFnZVxuICAgIGlmIChzdG9yZWRQcm9maWxlSWQpIHtcbiAgICAgIHRoaXMucHJvZmlsZUlkU2VsZWN0b3JFbGVtZW50LnZhbHVlID0gc3RvcmVkUHJvZmlsZUlkO1xuICAgIH1cblxuICAgIC8vIE1hbnVhbGx5IHRyaWdnZXIgc2VsZWN0ZWQgcHJvZmlsZSB0byBsb2FkXG4gICAgdGhpcy5vblByb2ZpbGVJZENoYW5nZSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIEhhbmRsZXIgZm9yIHRoZSBwcm9maWxlIGlkIHNlbGVjdGlvbiBjaGFuZ2VcbiAgICovXG4gIG9uUHJvZmlsZUlkQ2hhbmdlKCkge1xuICAgIHRoaXMuY2xlYXJTZWxlY3RlZFByb2ZpbGUoKTtcbiAgICB0aGlzLmhhbmRlZG5lc3NTZWxlY3RvckVsZW1lbnQuaW5uZXJIVE1MID0gJyc7XG5cbiAgICBjb25zdCBwcm9maWxlSWQgPSB0aGlzLnByb2ZpbGVJZFNlbGVjdG9yRWxlbWVudC52YWx1ZTtcbiAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3Byb2ZpbGVJZCcsIHByb2ZpbGVJZCk7XG5cbiAgICBpZiAocHJvZmlsZUlkID09PSB0aGlzLmxvY2FsUHJvZmlsZS5wcm9maWxlSWQpIHtcbiAgICAgIHRoaXMucHJvZmlsZSA9IHRoaXMubG9jYWxQcm9maWxlLnByb2ZpbGU7XG4gICAgICB0aGlzLnBvcHVsYXRlSGFuZGVkbmVzc1NlbGVjdG9yKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEF0dGVtcHQgdG8gbG9hZCB0aGUgcHJvZmlsZVxuICAgICAgdGhpcy5wcm9maWxlSWRTZWxlY3RvckVsZW1lbnQuZGlzYWJsZWQgPSB0cnVlO1xuICAgICAgdGhpcy5oYW5kZWRuZXNzU2VsZWN0b3JFbGVtZW50LmRpc2FibGVkID0gdHJ1ZTtcbiAgICAgIGZldGNoUHJvZmlsZSh7IHByb2ZpbGVzOiBbcHJvZmlsZUlkXSwgaGFuZGVkbmVzczogJ2FueScgfSwgcHJvZmlsZXNCYXNlUGF0aCwgbnVsbCwgZmFsc2UpLnRoZW4oKHsgcHJvZmlsZSB9KSA9PiB7XG4gICAgICAgIHRoaXMucHJvZmlsZSA9IHByb2ZpbGU7XG4gICAgICAgIHRoaXMucG9wdWxhdGVIYW5kZWRuZXNzU2VsZWN0b3IoKTtcbiAgICAgIH0pXG4gICAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICBBc3NldEVycm9yLmxvZyhlcnJvci5tZXNzYWdlKTtcbiAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfSlcbiAgICAgICAgLmZpbmFsbHkoKCkgPT4ge1xuICAgICAgICAgIHRoaXMucHJvZmlsZUlkU2VsZWN0b3JFbGVtZW50LmRpc2FibGVkID0gZmFsc2U7XG4gICAgICAgICAgdGhpcy5oYW5kZWRuZXNzU2VsZWN0b3JFbGVtZW50LmRpc2FibGVkID0gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQb3B1bGF0ZXMgdGhlIGhhbmRlZG5lc3MgZHJvcGRvd24gd2l0aCB0aG9zZSBzdXBwb3J0ZWQgYnkgdGhlIHNlbGVjdGVkIHByb2ZpbGVcbiAgICovXG4gIHBvcHVsYXRlSGFuZGVkbmVzc1NlbGVjdG9yKCkge1xuICAgIC8vIExvYWQgYW5kIGNsZWFyIHRoZSBsYXN0IHNlbGVjdGlvbiBmb3IgdGhpcyBwcm9maWxlIGlkXG4gICAgY29uc3Qgc3RvcmVkSGFuZGVkbmVzcyA9IHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnaGFuZGVkbmVzcycpO1xuICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnaGFuZGVkbmVzcycpO1xuXG4gICAgLy8gUG9wdWxhdGUgaGFuZGVkbmVzcyBzZWxlY3RvclxuICAgIE9iamVjdC5rZXlzKHRoaXMucHJvZmlsZS5sYXlvdXRzKS5mb3JFYWNoKChoYW5kZWRuZXNzKSA9PiB7XG4gICAgICB0aGlzLmhhbmRlZG5lc3NTZWxlY3RvckVsZW1lbnQuaW5uZXJIVE1MICs9IGBcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT0nJHtoYW5kZWRuZXNzfSc+JHtoYW5kZWRuZXNzfTwvb3B0aW9uPlxuICAgICAgYDtcbiAgICB9KTtcblxuICAgIC8vIEFwcGx5IHN0b3JlZCBoYW5kZWRuZXNzIGlmIGZvdW5kXG4gICAgaWYgKHN0b3JlZEhhbmRlZG5lc3MgJiYgdGhpcy5wcm9maWxlLmxheW91dHNbc3RvcmVkSGFuZGVkbmVzc10pIHtcbiAgICAgIHRoaXMuaGFuZGVkbmVzc1NlbGVjdG9yRWxlbWVudC52YWx1ZSA9IHN0b3JlZEhhbmRlZG5lc3M7XG4gICAgfVxuXG4gICAgLy8gTWFudWFsbHkgdHJpZ2dlciBzZWxlY3RlZCBoYW5kZWRuZXNzIGNoYW5nZVxuICAgIHRoaXMub25IYW5kZWRuZXNzQ2hhbmdlKCk7XG4gIH1cblxuICAvKipcbiAgICogUmVzcG9uZHMgdG8gY2hhbmdlcyBpbiBzZWxlY3RlZCBoYW5kZWRuZXNzLlxuICAgKiBDcmVhdGVzIGEgbmV3IG1vdGlvbiBjb250cm9sbGVyIGZvciB0aGUgY29tYmluYXRpb24gb2YgcHJvZmlsZSBhbmQgaGFuZGVkbmVzcywgYW5kIGZpcmVzIGFuXG4gICAqIGV2ZW50IHRvIHNpZ25hbCB0aGUgY2hhbmdlXG4gICAqL1xuICBvbkhhbmRlZG5lc3NDaGFuZ2UoKSB7XG4gICAgQXNzZXRFcnJvci5jbGVhckFsbCgpO1xuICAgIHRoaXMuaGFuZGVkbmVzcyA9IHRoaXMuaGFuZGVkbmVzc1NlbGVjdG9yRWxlbWVudC52YWx1ZTtcbiAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2hhbmRlZG5lc3MnLCB0aGlzLmhhbmRlZG5lc3MpO1xuICAgIGlmICh0aGlzLmhhbmRlZG5lc3MpIHtcbiAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ3NlbGVjdGlvbmNoYW5nZScpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnc2VsZWN0aW9uY2xlYXInKSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgdGhlIHByb2ZpbGVzIGRyb3Bkb3duIHRvIGVuc3VyZSBsb2NhbCBwcm9maWxlIGlzIGluIHRoZSBsaXN0XG4gICAqL1xuICBvbkxvY2FsUHJvZmlsZUNoYW5nZSgpIHtcbiAgICB0aGlzLnBvcHVsYXRlUHJvZmlsZVNlbGVjdG9yKCk7XG4gIH1cblxuICAvKipcbiAgICogSW5kaWNhdGVzIGlmIHRoZSBjdXJyZW50bHkgc2VsZWN0ZWQgcHJvZmlsZSBzaG91bGQgYmUgc2hvd24gaW4gVlIgaW5zdGVhZFxuICAgKiBvZiB0aGUgcHJvZmlsZXMgYWR2ZXJ0aXNlZCBieSB0aGUgcmVhbCBYUklucHV0U291cmNlLlxuICAgKi9cbiAgZ2V0IGZvcmNlVlJQcm9maWxlKCkge1xuICAgIHJldHVybiB0aGlzLmZvcmNlVlJQcm9maWxlRWxlbWVudC5jaGVja2VkO1xuICB9XG5cbiAgLyoqXG4gICAqIEluZGljYXRlcyBpZiB0aGUgdGFyZ2V0UmF5U3BhY2UgZm9yIGFuIGlucHV0IHNvdXJjZSBzaG91bGQgYmUgdmlzdWFsaXplZCBpblxuICAgKiBWUi5cbiAgICovXG4gIGdldCBzaG93VGFyZ2V0UmF5KCkge1xuICAgIHJldHVybiB0aGlzLnNob3dUYXJnZXRSYXlFbGVtZW50LmNoZWNrZWQ7XG4gIH1cblxuICAvKipcbiAgICogQnVpbGRzIGEgTW90aW9uQ29udHJvbGxlciBlaXRoZXIgYmFzZWQgb24gdGhlIHN1cHBsaWVkIGlucHV0IHNvdXJjZSB1c2luZyB0aGUgbG9jYWwgcHJvZmlsZVxuICAgKiBpZiBpdCBpcyB0aGUgYmVzdCBtYXRjaCwgb3RoZXJ3aXNlIHVzZXMgdGhlIHJlbW90ZSBhc3NldHNcbiAgICogQHBhcmFtIHtYUklucHV0U291cmNlfSB4cklucHV0U291cmNlXG4gICAqL1xuICBhc3luYyBjcmVhdGVNb3Rpb25Db250cm9sbGVyKHhySW5wdXRTb3VyY2UpIHtcbiAgICBsZXQgcHJvZmlsZTtcbiAgICBsZXQgYXNzZXRQYXRoO1xuXG4gICAgLy8gQ2hlY2sgaWYgbG9jYWwgb3ZlcnJpZGUgc2hvdWxkIGJlIHVzZWRcbiAgICBsZXQgdXNlTG9jYWxQcm9maWxlID0gZmFsc2U7XG4gICAgaWYgKHRoaXMubG9jYWxQcm9maWxlLnByb2ZpbGVJZCkge1xuICAgICAgeHJJbnB1dFNvdXJjZS5wcm9maWxlcy5zb21lKChwcm9maWxlSWQpID0+IHtcbiAgICAgICAgY29uc3QgbWF0Y2hGb3VuZCA9IE9iamVjdC5rZXlzKHRoaXMucHJvZmlsZXNMaXN0KS5pbmNsdWRlcyhwcm9maWxlSWQpO1xuICAgICAgICB1c2VMb2NhbFByb2ZpbGUgPSBtYXRjaEZvdW5kICYmIChwcm9maWxlSWQgPT09IHRoaXMubG9jYWxQcm9maWxlLnByb2ZpbGVJZCk7XG4gICAgICAgIHJldHVybiBtYXRjaEZvdW5kO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gR2V0IHByb2ZpbGUgYW5kIGFzc2V0IHBhdGhcbiAgICBpZiAodXNlTG9jYWxQcm9maWxlKSB7XG4gICAgICAoeyBwcm9maWxlIH0gPSB0aGlzLmxvY2FsUHJvZmlsZSk7XG4gICAgICBjb25zdCBhc3NldE5hbWUgPSB0aGlzLmxvY2FsUHJvZmlsZS5wcm9maWxlLmxheW91dHNbeHJJbnB1dFNvdXJjZS5oYW5kZWRuZXNzXS5hc3NldFBhdGg7XG4gICAgICBhc3NldFBhdGggPSB0aGlzLmxvY2FsUHJvZmlsZS5hc3NldHNbYXNzZXROYW1lXSB8fCBhc3NldE5hbWU7XG4gICAgfSBlbHNlIHtcbiAgICAgICh7IHByb2ZpbGUsIGFzc2V0UGF0aCB9ID0gYXdhaXQgZmV0Y2hQcm9maWxlKHhySW5wdXRTb3VyY2UsIHByb2ZpbGVzQmFzZVBhdGgpKTtcbiAgICB9XG5cbiAgICAvLyBCdWlsZCBtb3Rpb24gY29udHJvbGxlclxuICAgIGNvbnN0IG1vdGlvbkNvbnRyb2xsZXIgPSBuZXcgTW90aW9uQ29udHJvbGxlcihcbiAgICAgIHhySW5wdXRTb3VyY2UsXG4gICAgICBwcm9maWxlLFxuICAgICAgYXNzZXRQYXRoXG4gICAgKTtcblxuICAgIHJldHVybiBtb3Rpb25Db250cm9sbGVyO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFByb2ZpbGVTZWxlY3RvcjtcbiIsImNvbnN0IGRlZmF1bHRCYWNrZ3JvdW5kID0gJ2dlb3JnZW50b3InO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBCYWNrZ3JvdW5kU2VsZWN0b3IgZXh0ZW5kcyBFdmVudFRhcmdldCB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKCk7XG5cbiAgICB0aGlzLmJhY2tncm91bmRTZWxlY3RvckVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFja2dyb3VuZFNlbGVjdG9yJyk7XG4gICAgdGhpcy5iYWNrZ3JvdW5kU2VsZWN0b3JFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsICgpID0+IHsgdGhpcy5vbkJhY2tncm91bmRDaGFuZ2UoKTsgfSk7XG5cbiAgICB0aGlzLnNlbGVjdGVkQmFja2dyb3VuZCA9IHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnYmFja2dyb3VuZCcpIHx8IGRlZmF1bHRCYWNrZ3JvdW5kO1xuICAgIHRoaXMuYmFja2dyb3VuZExpc3QgPSB7fTtcbiAgICBmZXRjaCgnYmFja2dyb3VuZHMvYmFja2dyb3VuZHMuanNvbicpXG4gICAgICAudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpXG4gICAgICAudGhlbigoYmFja2dyb3VuZHMpID0+IHtcbiAgICAgICAgdGhpcy5iYWNrZ3JvdW5kTGlzdCA9IGJhY2tncm91bmRzO1xuICAgICAgICBPYmplY3Qua2V5cyhiYWNrZ3JvdW5kcykuZm9yRWFjaCgoYmFja2dyb3VuZCkgPT4ge1xuICAgICAgICAgIGNvbnN0IG9wdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ29wdGlvbicpO1xuICAgICAgICAgIG9wdGlvbi52YWx1ZSA9IGJhY2tncm91bmQ7XG4gICAgICAgICAgb3B0aW9uLmlubmVyVGV4dCA9IGJhY2tncm91bmQ7XG4gICAgICAgICAgaWYgKHRoaXMuc2VsZWN0ZWRCYWNrZ3JvdW5kID09PSBiYWNrZ3JvdW5kKSB7XG4gICAgICAgICAgICBvcHRpb24uc2VsZWN0ZWQgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLmJhY2tncm91bmRTZWxlY3RvckVsZW1lbnQuYXBwZW5kQ2hpbGQob3B0aW9uKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ3NlbGVjdGlvbmNoYW5nZScpKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgb25CYWNrZ3JvdW5kQ2hhbmdlKCkge1xuICAgIHRoaXMuc2VsZWN0ZWRCYWNrZ3JvdW5kID0gdGhpcy5iYWNrZ3JvdW5kU2VsZWN0b3JFbGVtZW50LnZhbHVlO1xuICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnYmFja2dyb3VuZCcsIHRoaXMuc2VsZWN0ZWRCYWNrZ3JvdW5kKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdzZWxlY3Rpb25jaGFuZ2UnKSk7XG4gIH1cblxuICBnZXQgYmFja2dyb3VuZFBhdGgoKSB7XG4gICAgcmV0dXJuIHRoaXMuYmFja2dyb3VuZExpc3RbdGhpcy5zZWxlY3RlZEJhY2tncm91bmRdO1xuICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBpbXBvcnQvbm8tdW5yZXNvbHZlZCAqL1xuaW1wb3J0IHsgQ29uc3RhbnRzIH0gZnJvbSAnLi4vbW90aW9uLWNvbnRyb2xsZXJzLm1vZHVsZS5qcyc7XG4vKiBlc2xpbnQtZW5hYmxlICovXG5cbi8qKlxuICogQSBmYWxzZSBnYW1lcGFkIHRvIGJlIHVzZWQgaW4gdGVzdHNcbiAqL1xuY2xhc3MgTW9ja0dhbWVwYWQge1xuICAvKipcbiAgICogQHBhcmFtIHtPYmplY3R9IHByb2ZpbGVEZXNjcmlwdGlvbiAtIFRoZSBwcm9maWxlIGRlc2NyaXB0aW9uIHRvIHBhcnNlIHRvIGRldGVybWluZSB0aGUgbGVuZ3RoXG4gICAqIG9mIHRoZSBidXR0b24gYW5kIGF4ZXMgYXJyYXlzXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBoYW5kZWRuZXNzIC0gVGhlIGdhbWVwYWQncyBoYW5kZWRuZXNzXG4gICAqL1xuICBjb25zdHJ1Y3Rvcihwcm9maWxlRGVzY3JpcHRpb24sIGhhbmRlZG5lc3MpIHtcbiAgICBpZiAoIXByb2ZpbGVEZXNjcmlwdGlvbikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBwcm9maWxlRGVzY3JpcHRpb24gc3VwcGxpZWQnKTtcbiAgICB9XG5cbiAgICBpZiAoIWhhbmRlZG5lc3MpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTm8gaGFuZGVkbmVzcyBzdXBwbGllZCcpO1xuICAgIH1cblxuICAgIHRoaXMuaWQgPSBwcm9maWxlRGVzY3JpcHRpb24ucHJvZmlsZUlkO1xuXG4gICAgLy8gTG9vcCB0aHJvdWdoIHRoZSBwcm9maWxlIGRlc2NyaXB0aW9uIHRvIGRldGVybWluZSBob3cgbWFueSBlbGVtZW50cyB0byBwdXQgaW4gdGhlIGJ1dHRvbnNcbiAgICAvLyBhbmQgYXhlcyBhcnJheXNcbiAgICBsZXQgbWF4QnV0dG9uSW5kZXggPSAwO1xuICAgIGxldCBtYXhBeGlzSW5kZXggPSAwO1xuICAgIGNvbnN0IGxheW91dCA9IHByb2ZpbGVEZXNjcmlwdGlvbi5sYXlvdXRzW2hhbmRlZG5lc3NdO1xuICAgIHRoaXMubWFwcGluZyA9IGxheW91dC5tYXBwaW5nO1xuICAgIE9iamVjdC52YWx1ZXMobGF5b3V0LmNvbXBvbmVudHMpLmZvckVhY2goKHsgZ2FtZXBhZEluZGljZXMgfSkgPT4ge1xuICAgICAgY29uc3Qge1xuICAgICAgICBbQ29uc3RhbnRzLkNvbXBvbmVudFByb3BlcnR5LkJVVFRPTl06IGJ1dHRvbkluZGV4LFxuICAgICAgICBbQ29uc3RhbnRzLkNvbXBvbmVudFByb3BlcnR5LlhfQVhJU106IHhBeGlzSW5kZXgsXG4gICAgICAgIFtDb25zdGFudHMuQ29tcG9uZW50UHJvcGVydHkuWV9BWElTXTogeUF4aXNJbmRleFxuICAgICAgfSA9IGdhbWVwYWRJbmRpY2VzO1xuXG4gICAgICBpZiAoYnV0dG9uSW5kZXggIT09IHVuZGVmaW5lZCAmJiBidXR0b25JbmRleCA+IG1heEJ1dHRvbkluZGV4KSB7XG4gICAgICAgIG1heEJ1dHRvbkluZGV4ID0gYnV0dG9uSW5kZXg7XG4gICAgICB9XG5cbiAgICAgIGlmICh4QXhpc0luZGV4ICE9PSB1bmRlZmluZWQgJiYgKHhBeGlzSW5kZXggPiBtYXhBeGlzSW5kZXgpKSB7XG4gICAgICAgIG1heEF4aXNJbmRleCA9IHhBeGlzSW5kZXg7XG4gICAgICB9XG5cbiAgICAgIGlmICh5QXhpc0luZGV4ICE9PSB1bmRlZmluZWQgJiYgKHlBeGlzSW5kZXggPiBtYXhBeGlzSW5kZXgpKSB7XG4gICAgICAgIG1heEF4aXNJbmRleCA9IHlBeGlzSW5kZXg7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBGaWxsIHRoZSBheGVzIGFycmF5XG4gICAgdGhpcy5heGVzID0gW107XG4gICAgd2hpbGUgKHRoaXMuYXhlcy5sZW5ndGggPD0gbWF4QXhpc0luZGV4KSB7XG4gICAgICB0aGlzLmF4ZXMucHVzaCgwKTtcbiAgICB9XG5cbiAgICAvLyBGaWxsIHRoZSBidXR0b25zIGFycmF5XG4gICAgdGhpcy5idXR0b25zID0gW107XG4gICAgd2hpbGUgKHRoaXMuYnV0dG9ucy5sZW5ndGggPD0gbWF4QnV0dG9uSW5kZXgpIHtcbiAgICAgIHRoaXMuYnV0dG9ucy5wdXNoKHtcbiAgICAgICAgdmFsdWU6IDAsXG4gICAgICAgIHRvdWNoZWQ6IGZhbHNlLFxuICAgICAgICBwcmVzc2VkOiBmYWxzZVxuICAgICAgfSk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IE1vY2tHYW1lcGFkO1xuIiwiLyoqXG4gKiBBIGZha2UgWFJJbnB1dFNvdXJjZSB0aGF0IGNhbiBiZSB1c2VkIHRvIGluaXRpYWxpemUgYSBNb3Rpb25Db250cm9sbGVyXG4gKi9cbmNsYXNzIE1vY2tYUklucHV0U291cmNlIHtcbiAgLyoqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBnYW1lcGFkIC0gVGhlIEdhbWVwYWQgb2JqZWN0IHRoYXQgcHJvdmlkZXMgdGhlIGJ1dHRvbiBhbmQgYXhpcyBkYXRhXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBoYW5kZWRuZXNzIC0gVGhlIGhhbmRlZG5lc3MgdG8gcmVwb3J0XG4gICAqL1xuICBjb25zdHJ1Y3Rvcihwcm9maWxlcywgZ2FtZXBhZCwgaGFuZGVkbmVzcykge1xuICAgIHRoaXMuZ2FtZXBhZCA9IGdhbWVwYWQ7XG5cbiAgICBpZiAoIWhhbmRlZG5lc3MpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTm8gaGFuZGVkbmVzcyBzdXBwbGllZCcpO1xuICAgIH1cblxuICAgIHRoaXMuaGFuZGVkbmVzcyA9IGhhbmRlZG5lc3M7XG4gICAgdGhpcy5wcm9maWxlcyA9IE9iamVjdC5mcmVlemUocHJvZmlsZXMpO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IE1vY2tYUklucHV0U291cmNlO1xuIiwiLyogZXNsaW50LWRpc2FibGUgaW1wb3J0L25vLXVucmVzb2x2ZWQgKi9cbmltcG9ydCAqIGFzIFRIUkVFIGZyb20gJy4vdGhyZWUvYnVpbGQvdGhyZWUubW9kdWxlLmpzJztcbmltcG9ydCB7IE9yYml0Q29udHJvbHMgfSBmcm9tICcuL3RocmVlL2V4YW1wbGVzL2pzbS9jb250cm9scy9PcmJpdENvbnRyb2xzLmpzJztcbmltcG9ydCB7IFJHQkVMb2FkZXIgfSBmcm9tICcuL3RocmVlL2V4YW1wbGVzL2pzbS9sb2FkZXJzL1JHQkVMb2FkZXIuanMnO1xuaW1wb3J0IHsgVlJCdXR0b24gfSBmcm9tICcuL3RocmVlL2V4YW1wbGVzL2pzbS93ZWJ4ci9WUkJ1dHRvbi5qcyc7XG4vKiBlc2xpbnQtZW5hYmxlICovXG5cbmltcG9ydCBNYW51YWxDb250cm9scyBmcm9tICcuL21hbnVhbENvbnRyb2xzLmpzJztcbmltcG9ydCBDb250cm9sbGVyTW9kZWwgZnJvbSAnLi9jb250cm9sbGVyTW9kZWwuanMnO1xuaW1wb3J0IFByb2ZpbGVTZWxlY3RvciBmcm9tICcuL3Byb2ZpbGVTZWxlY3Rvci5qcyc7XG5pbXBvcnQgQmFja2dyb3VuZFNlbGVjdG9yIGZyb20gJy4vYmFja2dyb3VuZFNlbGVjdG9yLmpzJztcbmltcG9ydCBBc3NldEVycm9yIGZyb20gJy4vYXNzZXRFcnJvci5qcyc7XG5pbXBvcnQgTW9ja0dhbWVwYWQgZnJvbSAnLi9tb2Nrcy9tb2NrR2FtZXBhZC5qcyc7XG5pbXBvcnQgTW9ja1hSSW5wdXRTb3VyY2UgZnJvbSAnLi9tb2Nrcy9tb2NrWFJJbnB1dFNvdXJjZS5qcyc7XG5cbmNvbnN0IHRocmVlID0ge307XG5sZXQgY2FudmFzUGFyZW50RWxlbWVudDtcbmxldCB2clByb2ZpbGVzRWxlbWVudDtcbmxldCB2clByb2ZpbGVzTGlzdEVsZW1lbnQ7XG5cbmxldCBwcm9maWxlU2VsZWN0b3I7XG5sZXQgYmFja2dyb3VuZFNlbGVjdG9yO1xubGV0IG1vY2tDb250cm9sbGVyTW9kZWw7XG5sZXQgaXNJbW1lcnNpdmUgPSBmYWxzZTtcblxuLyoqXG4gKiBBZGRzIHRoZSBldmVudCBoYW5kbGVycyBmb3IgVlIgbW90aW9uIGNvbnRyb2xsZXJzIHRvIGxvYWQgdGhlIGFzc2V0cyBvbiBjb25uZWN0aW9uXG4gKiBhbmQgcmVtb3ZlIHRoZW0gb24gZGlzY29ubmVjdGlvblxuICogQHBhcmFtIHtudW1iZXJ9IGluZGV4XG4gKi9cbmZ1bmN0aW9uIGluaXRpYWxpemVWUkNvbnRyb2xsZXIoaW5kZXgpIHtcbiAgY29uc3QgdnJDb250cm9sbGVyR3JpcCA9IHRocmVlLnJlbmRlcmVyLnhyLmdldENvbnRyb2xsZXJHcmlwKGluZGV4KTtcblxuICB2ckNvbnRyb2xsZXJHcmlwLmFkZEV2ZW50TGlzdGVuZXIoJ2Nvbm5lY3RlZCcsIGFzeW5jIChldmVudCkgPT4ge1xuICAgIGNvbnN0IGNvbnRyb2xsZXJNb2RlbCA9IG5ldyBDb250cm9sbGVyTW9kZWwoKTtcbiAgICB2ckNvbnRyb2xsZXJHcmlwLmFkZChjb250cm9sbGVyTW9kZWwpO1xuXG4gICAgbGV0IHhySW5wdXRTb3VyY2UgPSBldmVudC5kYXRhO1xuXG4gICAgdnJQcm9maWxlc0xpc3RFbGVtZW50LmlubmVySFRNTCArPSBgPGxpPjxiPiR7eHJJbnB1dFNvdXJjZS5oYW5kZWRuZXNzfTo8L2I+IFske3hySW5wdXRTb3VyY2UucHJvZmlsZXN9XTwvbGk+YDtcblxuICAgIGlmIChwcm9maWxlU2VsZWN0b3IuZm9yY2VWUlByb2ZpbGUpIHtcbiAgICAgIHhySW5wdXRTb3VyY2UgPSBuZXcgTW9ja1hSSW5wdXRTb3VyY2UoXG4gICAgICAgIFtwcm9maWxlU2VsZWN0b3IucHJvZmlsZS5wcm9maWxlSWRdLCBldmVudC5kYXRhLmdhbWVwYWQsIGV2ZW50LmRhdGEuaGFuZGVkbmVzc1xuICAgICAgKTtcbiAgICB9XG5cbiAgICBjb25zdCBtb3Rpb25Db250cm9sbGVyID0gYXdhaXQgcHJvZmlsZVNlbGVjdG9yLmNyZWF0ZU1vdGlvbkNvbnRyb2xsZXIoeHJJbnB1dFNvdXJjZSk7XG4gICAgYXdhaXQgY29udHJvbGxlck1vZGVsLmluaXRpYWxpemUobW90aW9uQ29udHJvbGxlcik7XG5cbiAgICBpZiAodGhyZWUuZW52aXJvbm1lbnRNYXApIHtcbiAgICAgIGNvbnRyb2xsZXJNb2RlbC5lbnZpcm9ubWVudE1hcCA9IHRocmVlLmVudmlyb25tZW50TWFwO1xuICAgIH1cbiAgfSk7XG5cbiAgdnJDb250cm9sbGVyR3JpcC5hZGRFdmVudExpc3RlbmVyKCdkaXNjb25uZWN0ZWQnLCAoKSA9PiB7XG4gICAgdnJDb250cm9sbGVyR3JpcC5yZW1vdmUodnJDb250cm9sbGVyR3JpcC5jaGlsZHJlblswXSk7XG4gIH0pO1xuXG4gIHRocmVlLnNjZW5lLmFkZCh2ckNvbnRyb2xsZXJHcmlwKTtcblxuICBjb25zdCB2ckNvbnRyb2xsZXJUYXJnZXQgPSB0aHJlZS5yZW5kZXJlci54ci5nZXRDb250cm9sbGVyKGluZGV4KTtcblxuICB2ckNvbnRyb2xsZXJUYXJnZXQuYWRkRXZlbnRMaXN0ZW5lcignY29ubmVjdGVkJywgKCkgPT4ge1xuICAgIGlmIChwcm9maWxlU2VsZWN0b3Iuc2hvd1RhcmdldFJheSkge1xuICAgICAgY29uc3QgZ2VvbWV0cnkgPSBuZXcgVEhSRUUuQnVmZmVyR2VvbWV0cnkoKTtcbiAgICAgIGdlb21ldHJ5LnNldEF0dHJpYnV0ZSgncG9zaXRpb24nLCBuZXcgVEhSRUUuRmxvYXQzMkJ1ZmZlckF0dHJpYnV0ZShbMCwgMCwgMCwgMCwgMCwgLTFdLCAzKSk7XG4gICAgICBnZW9tZXRyeS5zZXRBdHRyaWJ1dGUoJ2NvbG9yJywgbmV3IFRIUkVFLkZsb2F0MzJCdWZmZXJBdHRyaWJ1dGUoWzAuNSwgMC41LCAwLjUsIDAsIDAsIDBdLCAzKSk7XG5cbiAgICAgIGNvbnN0IG1hdGVyaWFsID0gbmV3IFRIUkVFLkxpbmVCYXNpY01hdGVyaWFsKHtcbiAgICAgICAgdmVydGV4Q29sb3JzOiBUSFJFRS5WZXJ0ZXhDb2xvcnMsXG4gICAgICAgIGJsZW5kaW5nOiBUSFJFRS5BZGRpdGl2ZUJsZW5kaW5nXG4gICAgICB9KTtcblxuICAgICAgdnJDb250cm9sbGVyVGFyZ2V0LmFkZChuZXcgVEhSRUUuTGluZShnZW9tZXRyeSwgbWF0ZXJpYWwpKTtcbiAgICB9XG4gIH0pO1xuXG4gIHZyQ29udHJvbGxlclRhcmdldC5hZGRFdmVudExpc3RlbmVyKCdkaXNjb25uZWN0ZWQnLCAoKSA9PiB7XG4gICAgaWYgKHZyQ29udHJvbGxlclRhcmdldC5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgIHZyQ29udHJvbGxlclRhcmdldC5yZW1vdmUodnJDb250cm9sbGVyVGFyZ2V0LmNoaWxkcmVuWzBdKTtcbiAgICB9XG4gIH0pO1xuXG4gIHRocmVlLnNjZW5lLmFkZCh2ckNvbnRyb2xsZXJUYXJnZXQpO1xufVxuXG4vKipcbiAqIFRoZSB0aHJlZS5qcyByZW5kZXIgbG9vcCAodXNlZCBpbnN0ZWFkIG9mIHJlcXVlc3RBbmltYXRpb25GcmFtZSB0byBzdXBwb3J0IFhSKVxuICovXG5mdW5jdGlvbiByZW5kZXIoKSB7XG4gIGlmIChtb2NrQ29udHJvbGxlck1vZGVsKSB7XG4gICAgaWYgKGlzSW1tZXJzaXZlKSB7XG4gICAgICB0aHJlZS5zY2VuZS5yZW1vdmUobW9ja0NvbnRyb2xsZXJNb2RlbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocmVlLnNjZW5lLmFkZChtb2NrQ29udHJvbGxlck1vZGVsKTtcbiAgICAgIE1hbnVhbENvbnRyb2xzLnVwZGF0ZVRleHQoKTtcbiAgICB9XG4gIH1cblxuICB0aHJlZS5jYW1lcmFDb250cm9scy51cGRhdGUoKTtcblxuICB0aHJlZS5yZW5kZXJlci5yZW5kZXIodGhyZWUuc2NlbmUsIHRocmVlLmNhbWVyYSk7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uIEV2ZW50IGhhbmRsZXIgZm9yIHdpbmRvdyByZXNpemluZy5cbiAqL1xuZnVuY3Rpb24gb25SZXNpemUoKSB7XG4gIGNvbnN0IHdpZHRoID0gY2FudmFzUGFyZW50RWxlbWVudC5jbGllbnRXaWR0aDtcbiAgY29uc3QgaGVpZ2h0ID0gY2FudmFzUGFyZW50RWxlbWVudC5jbGllbnRIZWlnaHQ7XG4gIHRocmVlLmNhbWVyYS5hc3BlY3QgPSB3aWR0aCAvIGhlaWdodDtcbiAgdGhyZWUuY2FtZXJhLnVwZGF0ZVByb2plY3Rpb25NYXRyaXgoKTtcbiAgdGhyZWUucmVuZGVyZXIuc2V0U2l6ZSh3aWR0aCwgaGVpZ2h0KTtcbiAgdGhyZWUuY2FtZXJhQ29udHJvbHMudXBkYXRlKCk7XG59XG5cbi8qKlxuICogSW5pdGlhbGl6ZXMgdGhlIHRocmVlLmpzIHJlc291cmNlcyBuZWVkZWQgZm9yIHRoaXMgcGFnZVxuICovXG5mdW5jdGlvbiBpbml0aWFsaXplVGhyZWUoKSB7XG4gIGNhbnZhc1BhcmVudEVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbW9kZWxWaWV3ZXInKTtcbiAgY29uc3Qgd2lkdGggPSBjYW52YXNQYXJlbnRFbGVtZW50LmNsaWVudFdpZHRoO1xuICBjb25zdCBoZWlnaHQgPSBjYW52YXNQYXJlbnRFbGVtZW50LmNsaWVudEhlaWdodDtcblxuICB2clByb2ZpbGVzRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd2clByb2ZpbGVzJyk7XG4gIHZyUHJvZmlsZXNMaXN0RWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd2clByb2ZpbGVzTGlzdCcpO1xuXG4gIC8vIFNldCB1cCB0aGUgVEhSRUUuanMgaW5mcmFzdHJ1Y3R1cmVcbiAgdGhyZWUuY2FtZXJhID0gbmV3IFRIUkVFLlBlcnNwZWN0aXZlQ2FtZXJhKDc1LCB3aWR0aCAvIGhlaWdodCwgMC4wMSwgMTAwMCk7XG4gIHRocmVlLmNhbWVyYS5wb3NpdGlvbi55ID0gMC41O1xuICB0aHJlZS5zY2VuZSA9IG5ldyBUSFJFRS5TY2VuZSgpO1xuICB0aHJlZS5zY2VuZS5iYWNrZ3JvdW5kID0gbmV3IFRIUkVFLkNvbG9yKDB4MDBhYTQ0KTtcbiAgdGhyZWUucmVuZGVyZXIgPSBuZXcgVEhSRUUuV2ViR0xSZW5kZXJlcih7IGFudGlhbGlhczogdHJ1ZSB9KTtcbiAgdGhyZWUucmVuZGVyZXIuc2V0U2l6ZSh3aWR0aCwgaGVpZ2h0KTtcbiAgdGhyZWUucmVuZGVyZXIub3V0cHV0RW5jb2RpbmcgPSBUSFJFRS5zUkdCRW5jb2Rpbmc7XG5cbiAgLy8gU2V0IHVwIHRoZSBjb250cm9scyBmb3IgbW92aW5nIHRoZSBzY2VuZSBhcm91bmRcbiAgdGhyZWUuY2FtZXJhQ29udHJvbHMgPSBuZXcgT3JiaXRDb250cm9scyh0aHJlZS5jYW1lcmEsIHRocmVlLnJlbmRlcmVyLmRvbUVsZW1lbnQpO1xuICB0aHJlZS5jYW1lcmFDb250cm9scy5lbmFibGVEYW1waW5nID0gdHJ1ZTtcbiAgdGhyZWUuY2FtZXJhQ29udHJvbHMubWluRGlzdGFuY2UgPSAwLjA1O1xuICB0aHJlZS5jYW1lcmFDb250cm9scy5tYXhEaXN0YW5jZSA9IDAuMztcbiAgdGhyZWUuY2FtZXJhQ29udHJvbHMuZW5hYmxlUGFuID0gZmFsc2U7XG4gIHRocmVlLmNhbWVyYUNvbnRyb2xzLnVwZGF0ZSgpO1xuXG4gIC8vIEFkZCBWUlxuICBjYW52YXNQYXJlbnRFbGVtZW50LmFwcGVuZENoaWxkKFZSQnV0dG9uLmNyZWF0ZUJ1dHRvbih0aHJlZS5yZW5kZXJlcikpO1xuICB0aHJlZS5yZW5kZXJlci54ci5lbmFibGVkID0gdHJ1ZTtcbiAgdGhyZWUucmVuZGVyZXIueHIuYWRkRXZlbnRMaXN0ZW5lcignc2Vzc2lvbnN0YXJ0JywgKCkgPT4ge1xuICAgIHZyUHJvZmlsZXNFbGVtZW50LmhpZGRlbiA9IGZhbHNlO1xuICAgIHZyUHJvZmlsZXNMaXN0RWxlbWVudC5pbm5lckhUTUwgPSAnJztcbiAgICBpc0ltbWVyc2l2ZSA9IHRydWU7XG4gIH0pO1xuICB0aHJlZS5yZW5kZXJlci54ci5hZGRFdmVudExpc3RlbmVyKCdzZXNzaW9uZW5kJywgKCkgPT4geyBpc0ltbWVyc2l2ZSA9IGZhbHNlOyB9KTtcbiAgaW5pdGlhbGl6ZVZSQ29udHJvbGxlcigwKTtcbiAgaW5pdGlhbGl6ZVZSQ29udHJvbGxlcigxKTtcblxuICAvLyBBZGQgdGhlIFRIUkVFLmpzIGNhbnZhcyB0byB0aGUgcGFnZVxuICBjYW52YXNQYXJlbnRFbGVtZW50LmFwcGVuZENoaWxkKHRocmVlLnJlbmRlcmVyLmRvbUVsZW1lbnQpO1xuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgb25SZXNpemUsIGZhbHNlKTtcblxuICAvLyBTdGFydCBwdW1waW5nIGZyYW1lc1xuICB0aHJlZS5yZW5kZXJlci5zZXRBbmltYXRpb25Mb29wKHJlbmRlcik7XG59XG5cbmZ1bmN0aW9uIG9uU2VsZWN0aW9uQ2xlYXIoKSB7XG4gIE1hbnVhbENvbnRyb2xzLmNsZWFyKCk7XG4gIGlmIChtb2NrQ29udHJvbGxlck1vZGVsKSB7XG4gICAgdGhyZWUuc2NlbmUucmVtb3ZlKG1vY2tDb250cm9sbGVyTW9kZWwpO1xuICAgIG1vY2tDb250cm9sbGVyTW9kZWwgPSBudWxsO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIG9uU2VsZWN0aW9uQ2hhbmdlKCkge1xuICBvblNlbGVjdGlvbkNsZWFyKCk7XG4gIGNvbnN0IG1vY2tHYW1lcGFkID0gbmV3IE1vY2tHYW1lcGFkKHByb2ZpbGVTZWxlY3Rvci5wcm9maWxlLCBwcm9maWxlU2VsZWN0b3IuaGFuZGVkbmVzcyk7XG4gIGNvbnN0IG1vY2tYUklucHV0U291cmNlID0gbmV3IE1vY2tYUklucHV0U291cmNlKFxuICAgIFtwcm9maWxlU2VsZWN0b3IucHJvZmlsZS5wcm9maWxlSWRdLCBtb2NrR2FtZXBhZCwgcHJvZmlsZVNlbGVjdG9yLmhhbmRlZG5lc3NcbiAgKTtcbiAgbW9ja0NvbnRyb2xsZXJNb2RlbCA9IG5ldyBDb250cm9sbGVyTW9kZWwobW9ja1hSSW5wdXRTb3VyY2UpO1xuICB0aHJlZS5zY2VuZS5hZGQobW9ja0NvbnRyb2xsZXJNb2RlbCk7XG5cbiAgY29uc3QgbW90aW9uQ29udHJvbGxlciA9IGF3YWl0IHByb2ZpbGVTZWxlY3Rvci5jcmVhdGVNb3Rpb25Db250cm9sbGVyKG1vY2tYUklucHV0U291cmNlKTtcbiAgTWFudWFsQ29udHJvbHMuYnVpbGQobW90aW9uQ29udHJvbGxlcik7XG4gIGF3YWl0IG1vY2tDb250cm9sbGVyTW9kZWwuaW5pdGlhbGl6ZShtb3Rpb25Db250cm9sbGVyKTtcblxuICBpZiAodGhyZWUuZW52aXJvbm1lbnRNYXApIHtcbiAgICBtb2NrQ29udHJvbGxlck1vZGVsLmVudmlyb25tZW50TWFwID0gdGhyZWUuZW52aXJvbm1lbnRNYXA7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gb25CYWNrZ3JvdW5kQ2hhbmdlKCkge1xuICBjb25zdCBwbXJlbUdlbmVyYXRvciA9IG5ldyBUSFJFRS5QTVJFTUdlbmVyYXRvcih0aHJlZS5yZW5kZXJlcik7XG4gIHBtcmVtR2VuZXJhdG9yLmNvbXBpbGVFcXVpcmVjdGFuZ3VsYXJTaGFkZXIoKTtcblxuICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGNvbnN0IHJnYmVMb2FkZXIgPSBuZXcgUkdCRUxvYWRlcigpO1xuICAgIHJnYmVMb2FkZXIuc2V0RGF0YVR5cGUoVEhSRUUuVW5zaWduZWRCeXRlVHlwZSk7XG4gICAgcmdiZUxvYWRlci5zZXRQYXRoKCdiYWNrZ3JvdW5kcy8nKTtcbiAgICByZ2JlTG9hZGVyLmxvYWQoYmFja2dyb3VuZFNlbGVjdG9yLmJhY2tncm91bmRQYXRoLCAodGV4dHVyZSkgPT4ge1xuICAgICAgdGhyZWUuZW52aXJvbm1lbnRNYXAgPSBwbXJlbUdlbmVyYXRvci5mcm9tRXF1aXJlY3Rhbmd1bGFyKHRleHR1cmUpLnRleHR1cmU7XG4gICAgICB0aHJlZS5zY2VuZS5iYWNrZ3JvdW5kID0gdGhyZWUuZW52aXJvbm1lbnRNYXA7XG5cbiAgICAgIGlmIChtb2NrQ29udHJvbGxlck1vZGVsKSB7XG4gICAgICAgIG1vY2tDb250cm9sbGVyTW9kZWwuZW52aXJvbm1lbnRNYXAgPSB0aHJlZS5lbnZpcm9ubWVudE1hcDtcbiAgICAgIH1cblxuICAgICAgcG1yZW1HZW5lcmF0b3IuZGlzcG9zZSgpO1xuICAgICAgcmVzb2x2ZSh0aHJlZS5lbnZpcm9ubWVudE1hcCk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIFBhZ2UgbG9hZCBoYW5kbGVyIGZvciBpbml0aWFsemluZyB0aGluZ3MgdGhhdCBkZXBlbmQgb24gdGhlIERPTSB0byBiZSByZWFkeVxuICovXG5mdW5jdGlvbiBvbkxvYWQoKSB7XG4gIEFzc2V0RXJyb3IuaW5pdGlhbGl6ZSgpO1xuICBwcm9maWxlU2VsZWN0b3IgPSBuZXcgUHJvZmlsZVNlbGVjdG9yKCk7XG4gIGluaXRpYWxpemVUaHJlZSgpO1xuXG4gIHByb2ZpbGVTZWxlY3Rvci5hZGRFdmVudExpc3RlbmVyKCdzZWxlY3Rpb25jbGVhcicsIG9uU2VsZWN0aW9uQ2xlYXIpO1xuICBwcm9maWxlU2VsZWN0b3IuYWRkRXZlbnRMaXN0ZW5lcignc2VsZWN0aW9uY2hhbmdlJywgb25TZWxlY3Rpb25DaGFuZ2UpO1xuXG4gIGJhY2tncm91bmRTZWxlY3RvciA9IG5ldyBCYWNrZ3JvdW5kU2VsZWN0b3IoKTtcbiAgYmFja2dyb3VuZFNlbGVjdG9yLmFkZEV2ZW50TGlzdGVuZXIoJ3NlbGVjdGlvbmNoYW5nZScsIG9uQmFja2dyb3VuZENoYW5nZSk7XG59XG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIG9uTG9hZCk7XG4iXSwibmFtZXMiOlsiVEhSRUUuT2JqZWN0M0QiLCJUSFJFRS5TcGhlcmVHZW9tZXRyeSIsIlRIUkVFLk1lc2hCYXNpY01hdGVyaWFsIiwiVEhSRUUuTWVzaCIsIlRIUkVFLkJ1ZmZlckdlb21ldHJ5IiwiVEhSRUUuRmxvYXQzMkJ1ZmZlckF0dHJpYnV0ZSIsIlRIUkVFLkxpbmVCYXNpY01hdGVyaWFsIiwiVEhSRUUuVmVydGV4Q29sb3JzIiwiVEhSRUUuQWRkaXRpdmVCbGVuZGluZyIsIlRIUkVFLkxpbmUiLCJUSFJFRS5QZXJzcGVjdGl2ZUNhbWVyYSIsIlRIUkVFLlNjZW5lIiwiVEhSRUUuQ29sb3IiLCJUSFJFRS5XZWJHTFJlbmRlcmVyIiwiVEhSRUUuc1JHQkVuY29kaW5nIiwiVEhSRUUuUE1SRU1HZW5lcmF0b3IiLCJUSFJFRS5VbnNpZ25lZEJ5dGVUeXBlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUFBLElBQUksZ0JBQWdCLENBQUM7QUFDckIsSUFBSSxXQUFXLENBQUM7QUFDaEIsSUFBSSxtQkFBbUIsQ0FBQzs7QUFFeEIsU0FBUyxVQUFVLEdBQUc7RUFDcEIsSUFBSSxnQkFBZ0IsRUFBRTtJQUNwQixNQUFNLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxD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
