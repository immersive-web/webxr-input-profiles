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
      const componentRoot = rootNode.getObjectByName(component.rootNodeName, true);

      if (!componentRoot) {
        ErrorLogging.log(`Could not find root node of touchpad component ${component.rootNodeName}`);
        return;
      }

      const touchPointRoot = componentRoot.getObjectByName(component.touchPointNodeName, true);
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
    const componentRootNode = model.rootNode.getObjectByName(component.rootNodeName, true);
    const componentNodes = {};

    // If the root node cannot be found, skip this component
    if (!componentRootNode) {
      ErrorLogging.log(`Could not find root node of component ${component.rootNodeName}`);
      return;
    }

    // Loop through all the visual responses to be applied to this component
    Object.values(component.visualResponses).forEach((visualResponse) => {
      const visualResponseNodes = {};
      const { rootNodeName, targetNodeName, property } = visualResponse.description;

      // Find the node at the top of the visualization
      if (rootNodeName === component.root) {
        visualResponseNodes.rootNode = componentRootNode;
      } else {
        visualResponseNodes.rootNode = componentRootNode.getObjectByName(rootNodeName, true);
      }

      // If the root node cannot be found, skip this animation
      if (!visualResponseNodes.rootNode) {
        ErrorLogging.log(`Could not find root node of visual response for ${rootNodeName}`);
        return;
      }

      // Find the node to be changed
      visualResponseNodes.targetNode = visualResponseNodes.rootNode.getObjectByName(targetNodeName);

      // If animating a transform, find the two nodes to be interpolated between.
      if (property === 'transform') {
        const { minNodeName, maxNodeName } = visualResponse.description;
        visualResponseNodes.minNode = visualResponseNodes.rootNode.getObjectByName(minNodeName);
        visualResponseNodes.maxNode = visualResponseNodes.rootNode.getObjectByName(maxNodeName);

        // If the extents cannot be found, skip this animation
        if (!visualResponseNodes.minNode || !visualResponseNodes.maxNode) {
          ErrorLogging.log(`Could not find extents nodes of visual response for ${rootNodeName}`);
          return;
        }
      }

      // Add the animation to the component's nodes dictionary
      componentNodes[rootNodeName] = visualResponseNodes;
    });

    // Add the component's animations to the controller's nodes dictionary
    nodes[component.id] = componentNodes;
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
      const componentNodes = activeModel.nodes[component.id];

      // Skip if the component node is not found. No error is needed, because it
      // will have been reported at load time.
      if (!componentNodes) return;

      // Update node data based on the visual responses' current states
      Object.values(component.visualResponses).forEach((visualResponse) => {
        const { description, value } = visualResponse;
        const visualResponseNodes = componentNodes[description.rootNodeName];

        // Skip if the visual response node is not found. No error is needed,
        // because it will have been reported at load time.
        if (!visualResponseNodes) return;

        // Calculate the new properties based on the weight supplied
        if (description.property === 'visibility') {
          visualResponseNodes.targetNode.visible = value;
        } else if (description.property === 'transform') {
          THREE.Quaternion.slerp(
            visualResponseNodes.minNode.quaternion,
            visualResponseNodes.maxNode.quaternion,
            visualResponseNodes.targetNode.quaternion,
            value
          );

          visualResponseNodes.targetNode.position.lerpVectors(
            visualResponseNodes.minNode.position,
            visualResponseNodes.maxNode.position,
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
      const gltfAsset = await new Promise(((resolve, reject) => {
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
        rootNode: gltfAsset.scene
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
