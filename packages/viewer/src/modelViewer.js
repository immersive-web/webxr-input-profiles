/* eslint-disable import/no-unresolved */
import * as THREE from './three/build/three.module.js';
import { GLTFLoader } from './three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from './three/examples/jsm/controls/OrbitControls.js';
import { Constants } from './motion-controllers.module.js';
/* eslint-enable */

import ErrorLogging from './errorLogging.js';

const three = {};
let canvasParentElement;
let activeModel;

/**
 * @description Attaches a small blue sphere to the point reported as touched on all touchpads
 * @param {Object} model - The model to add dots to
 * @param {Object} motionController - A MotionController to be displayed and animated
 * @param {Object} rootNode - The root node in the asset to be animated
 */
function addTouchDots({ motionController, rootNode }) {
  Object.keys(motionController.components).forEach((componentId) => {
    const component = motionController.components[componentId];
    // Find the touchpads
    if (component.type === Constants.ComponentType.TOUCHPAD) {
      // Find the node to attach the touch dot.
      const touchPointRoot = rootNode.getObjectByName(component.touchPointNodeName, true);
      if (!touchPointRoot) {
        ErrorLogging.log(`Could not find touch dot, ${component.touchPointNodeName}, in touchpad component ${componentId}`);
      } else {
        const sphereGeometry = new THREE.SphereGeometry(0.001);
        const material = new THREE.MeshBasicMaterial({ color: 0x0000FF });
        const sphere = new THREE.Mesh(sphereGeometry, material);
        touchPointRoot.add(sphere);
      }
    }
  });
}

/**
 * @description Walks the model's tree to find the nodes needed to animate the components and
 * saves them for use in the frame loop
 * @param {Object} model - The model to find nodes in
 */
function findNodes(model) {
  const nodes = {};

  // Loop through the components and find the nodes needed for each components' visual responses
  Object.values(model.motionController.components).forEach((component) => {
    const { touchPointNodeName, visualResponses } = component;
    if (touchPointNodeName) {
      nodes[touchPointNodeName] = model.rootNode.getObjectByName(touchPointNodeName);
    }

    // Loop through all the visual responses to be applied to this component
    Object.values(visualResponses).forEach((visualResponse) => {
      const {
        valueNodeName, minNodeName, maxNodeName, valueNodeProperty
      } = visualResponse;
      // If animating a transform, find the two nodes to be interpolated between.
      if (valueNodeProperty === Constants.VisualResponseProperty.TRANSFORM) {
        nodes[minNodeName] = model.rootNode.getObjectByName(minNodeName);
        nodes[maxNodeName] = model.rootNode.getObjectByName(maxNodeName);

        // If the extents cannot be found, skip this animation
        if (!nodes[minNodeName]) {
          ErrorLogging.log(`Could not find ${minNodeName} in the model`);
          return;
        }
        if (!nodes[maxNodeName]) {
          ErrorLogging.log(`Could not find ${maxNodeName} in the model`);
          return;
        }
      }

      // If the target node cannot be found, skip this animation
      nodes[valueNodeName] = model.rootNode.getObjectByName(valueNodeName);
      if (!nodes[valueNodeName]) {
        ErrorLogging.log(`Could not find ${valueNodeName} in the model`);
      }
    });
  });

  return nodes;
}


function clear() {
  if (activeModel) {
    // Remove any existing model from the scene
    three.scene.remove(activeModel.rootNode);
    activeModel = null;
  }

  ErrorLogging.clear();
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
  three.controls.update();
}

/**
 * @description Callback which runs the rendering loop. (Passed into window.requestAnimationFrame)
 */
function animationFrameCallback() {
  window.requestAnimationFrame(animationFrameCallback);

  if (activeModel) {
    // Cause the MotionController to poll the Gamepad for data
    activeModel.motionController.updateFromGamepad();

    // Update the 3D model to reflect the button, thumbstick, and touchpad state
    Object.values(activeModel.motionController.components).forEach((component) => {
      // Update node data based on the visual responses' current states
      Object.values(component.visualResponses).forEach((visualResponse) => {
        const {
          valueNodeName, minNodeName, maxNodeName, value, valueNodeProperty
        } = visualResponse;
        const valueNode = activeModel.nodes[valueNodeName];

        // Skip if the visual response node is not found. No error is needed,
        // because it will have been reported at load time.
        if (!valueNode) return;

        // Calculate the new properties based on the weight supplied
        if (valueNodeProperty === Constants.VisualResponseProperty.VISIBILITY) {
          valueNode.visible = value;
        } else if (valueNodeProperty === Constants.VisualResponseProperty.TRANSFORM) {
          const minNode = activeModel.nodes[minNodeName];
          const maxNode = activeModel.nodes[maxNodeName];
          THREE.Quaternion.slerp(
            minNode.quaternion,
            maxNode.quaternion,
            valueNode.quaternion,
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

  three.renderer.render(three.scene, three.camera);
  three.controls.update();
}

const ModelViewer = {
  initialize: () => {
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
    three.loader = new GLTFLoader();

    // Set up the controls for moving the scene around
    three.controls = new OrbitControls(three.camera, three.renderer.domElement);
    three.controls.enableDamping = true;
    three.controls.minDistance = 0.05;
    three.controls.maxDistance = 0.3;
    three.controls.enablePan = false;
    three.controls.update();

    // Set up the lights so the model can be seen
    const bottomDirectionalLight = new THREE.DirectionalLight(0xFFFFFF, 2);
    bottomDirectionalLight.position.set(0, -1, 0);
    three.scene.add(bottomDirectionalLight);
    const topDirectionalLight = new THREE.DirectionalLight(0xFFFFFF, 2);
    three.scene.add(topDirectionalLight);

    // Add the THREE.js canvas to the page
    canvasParentElement.appendChild(three.renderer.domElement);
    window.addEventListener('resize', onResize, false);

    // Start pumping frames
    window.requestAnimationFrame(animationFrameCallback);
  },

  loadModel: async (motionController) => {
    try {
      const asset = await new Promise(((resolve, reject) => {
        three.loader.load(
          motionController.assetUrl,
          (loadedAsset) => { resolve(loadedAsset); },
          null,
          () => { reject(new Error(`Asset ${motionController.assetUrl} missing or malformed.`)); }
        );
      }));

      // Remove any existing model from the scene
      clear();

      const model = {
        motionController,
        rootNode: asset.scene
      };

      model.nodes = findNodes(model);
      addTouchDots(model);

      // Set the new model
      activeModel = model;
      three.scene.add(activeModel.rootNode);
    } catch (error) {
      ErrorLogging.throw(error);
    }
  },

  clear
};

export default ModelViewer;
