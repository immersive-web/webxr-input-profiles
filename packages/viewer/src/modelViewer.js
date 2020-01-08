/* eslint-disable import/no-unresolved */
import * as THREE from './three/build/three.module.js';
import { OrbitControls } from './three/examples/jsm/controls/OrbitControls.js';
import { VRButton } from './three/examples/jsm/webxr/VRButton.js';
/* eslint-enable */

import ManualControls from './manualControls.js';
import ControllerModel from './controllerModel.js';
import ProfileSelector from './profileSelector.js';
import AssetError from './assetError.js';
import MockGamepad from './mocks/mockGamepad.js';
import MockXRInputSource from './mocks/mockXRInputSource.js';

const three = {};
let canvasParentElement;

let profileSelector;
let mockControllerModel;
let isImmersive = false;

/**
 * Adds the event handlers for VR motion controllers to load the assets on connection
 * and remove them on disconnection
 * @param {number} index
 */
function initializeVRController(index) {
  const vrController = three.renderer.xr.getController(index);

  vrController.addEventListener('connected', async (event) => {
    const controllerModel = new ControllerModel();
    vrController.add(controllerModel);

    const motionController = await profileSelector.createMotionController(event.data);
    await controllerModel.initialize(motionController);
  });

  vrController.addEventListener('disconnected', () => {
    vrController.remove(vrController.children[0]);
  });

  three.scene.add(vrController);
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
  three.camera.aspectRatio = width / height;
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

  // Set up the THREE.js infrastructure
  three.camera = new THREE.PerspectiveCamera(75, width / height, 0.01, 1000);
  three.camera.position.y = 0.5;
  three.scene = new THREE.Scene();
  three.scene.background = new THREE.Color(0x00aa44);
  three.renderer = new THREE.WebGLRenderer({ antialias: true });
  three.renderer.setSize(width, height);
  three.renderer.gammaOutput = true;

  // Set up the controls for moving the scene around
  three.cameraControls = new OrbitControls(three.camera, three.renderer.domElement);
  three.cameraControls.enableDamping = true;
  three.cameraControls.minDistance = 0.05;
  three.cameraControls.maxDistance = 0.3;
  three.cameraControls.enablePan = false;
  three.cameraControls.update();

  // Set up the lights so the model can be seen
  const bottomDirectionalLight = new THREE.DirectionalLight(0xFFFFFF, 2);
  bottomDirectionalLight.position.set(0, -1, 0);
  three.scene.add(bottomDirectionalLight);
  const topDirectionalLight = new THREE.DirectionalLight(0xFFFFFF, 2);
  three.scene.add(topDirectionalLight);

  // Add VR
  canvasParentElement.appendChild(VRButton.createButton(three.renderer));
  three.renderer.xr.enabled = true;
  three.renderer.xr.addEventListener('sessionstart', () => { isImmersive = true; });
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
  const mockXRInputSource = new MockXRInputSource(mockGamepad, profileSelector.handedness);
  mockControllerModel = new ControllerModel(mockXRInputSource);
  three.scene.add(mockControllerModel);

  const motionController = await profileSelector.createMotionController(mockXRInputSource);
  ManualControls.build(motionController);
  await mockControllerModel.initialize(motionController);
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
}
window.addEventListener('load', onLoad);
