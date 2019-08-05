/* eslint import/no-unresolved: off */

import * as THREE from '../../../node_modules/three/build/three.module.js';
import { GLTFLoader } from '../../../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from '../../../node_modules/three/examples/jsm/controls/OrbitControls.js';

const three = {};
let canvasParentElement;
let assetErrorElement;
let activeModel;

/**
 * @description Attaches a small blue sphere to the point reported as touched on all touchpads
 * @param {Object} model - The model to add dots to
 * @param {Object} motionController - A MotionController to be displayed and animated
 * @param {Object} rootNode - The root node in the asset to be animated
 */
function addTouchDots({ motionController, rootNode }) {
  Object.values(motionController.components).forEach((component) => {
    // Find the touchpads
    if (component.dataSource.dataSourceType === 'touchpadSource') {
      // Find the node to attach the touch dot.
      const componentRoot = rootNode.getObjectByName(component.rootNodeName, true);
      const touchDotRoot = componentRoot.getObjectByName(component.touchDotNodeName, true);

      const sphereGeometry = new THREE.SphereGeometry(0.001);
      const material = new THREE.MeshBasicMaterial({ color: 0x0000FF });
      const sphere = new THREE.Mesh(sphereGeometry, material);
      touchDotRoot.add(sphere);
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
        // eslint-disable-next-line no-console
        console.error(`Could not find root node of visual response for ${rootNodeName}`);
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
          // eslint-disable-next-line no-console
          console.error(`Could not find extents nodes of visual response for ${rootNodeName}`);
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

    // Set the page element with controller data for debugging
    const dataElement = document.getElementById('data');
    dataElement.innerHTML = '';

    activeModel = null;
  }

  assetErrorElement.innerText = '';
  assetErrorElement.hidden = true;
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

    // Set the page element with controller data for debugging
    const dataElement = document.getElementById('data');
    dataElement.innerHTML = JSON.stringify(activeModel.motionController.data, null, 2);

    // Update the 3D model to reflect the button, thumbstick, and touchpad state
    Object.values(activeModel.motionController.components).forEach((component) => {
      const componentNodes = activeModel.nodes[component.id];

      // Update node data based on the visual responses' current states
      Object.values(component.visualResponses).forEach((visualResponse) => {
        const { description, value } = visualResponse;
        const visualResponseNodes = componentNodes[description.rootNodeName];

        if (!visualResponseNodes) {
          // eslint-disable-next-line no-console
          console.error(`Unable to find nodes for animation of ${description.rootNodeName}`);
          return;
        }

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
    assetErrorElement = document.getElementById('assetError');
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

  loadModel: (motionController) => {
    // Remove any existing model from the scene
    clear();

    const onLoad = (gltfAsset) => {
      const model = {
        motionController,
        rootNode: gltfAsset.scene
      };

      model.nodes = findNodes(model);
      addTouchDots(model);

      // Set the new model
      activeModel = model;
      three.scene.add(activeModel.rootNode);
    };

    const onError = () => {
      const errorMessage = `Asset failed to load either because it was missing or malformed. ${motionController.assetPath}`;
      assetErrorElement.innerText = errorMessage;
      assetErrorElement.hidden = false;
      throw new Error(errorMessage);
    };

    three.loader.load(
      motionController.assetPath,
      onLoad,
      null,
      onError
    );
  },

  clear
};

export default ModelViewer;
