/* eslint import/no-unresolved: off */

import * as THREE from '../../../node_modules/three/build/three.module.js';
import { GLTFLoader } from '../../../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from '../../../node_modules/three/examples/jsm/controls/OrbitControls.js';

const three = {};
let parentElement;
let motionController;
let motionControllerRoot;


function updateMotionController() {
  motionController.updateFromGamepad();
  const dataElement = document.getElementById('data');
  dataElement.innerHTML = JSON.stringify(motionController.data, null, 2);
}

function onResize() {
  const width = parentElement.clientWidth;
  const height = parentElement.clientHeight;
  three.camera.aspectRatio = width / height;
  three.camera.updateProjectionMatrix();
  three.renderer.setSize(width, height);
  three.controls.update();
}

function animationFrameCallback() {
  window.requestAnimationFrame(animationFrameCallback);

  if (motionControllerRoot) {
    // Cause the MotionController to poll the Gamepad for data
    updateMotionController();

    // Update the 3D model to reflect the button, thumbstick, and touchpad state
    Object.values(motionController.components).forEach((component) => {
      const componentRoot = motionControllerRoot.getObjectByName(component.rootNodeName, true);
      component.visualResponses.weightedNodes.forEach((weightedNode) => {
        // Find the topmost node in the visualization
        let visualResponseRoot;
        if (weightedNode.rootNodeName === component.root) {
          visualResponseRoot = componentRoot;
        } else {
          visualResponseRoot = componentRoot.getObjectByName(weightedNode.rootNodeName, true);
        }

        if (!visualResponseRoot) {
          return;
        }

        // Find the node to be changed
        const targetNode = visualResponseRoot.getObjectByName(weightedNode.targetNodeName);
        if (!targetNode) {
          return;
        }

        // Calculate the new properties based on the weight supplied
        if (weightedNode.property === 'visibility') {
          targetNode.visible = weightedNode.value;
        } else if (weightedNode.property === 'transform') {
          const minNode = visualResponseRoot.getObjectByName(weightedNode.minNodeName);
          const maxNode = visualResponseRoot.getObjectByName(weightedNode.maxNodeName);
          if (!minNode || !maxNode) {
            return;
          }

          THREE.Quaternion.slerp(
            minNode.quaternion,
            maxNode.quaternion,
            targetNode.quaternion,
            weightedNode.value
          );

          targetNode.position.lerpVectors(
            minNode.position,
            maxNode.position,
            weightedNode.value
          );
        }
      });
    });
  }

  three.renderer.render(three.scene, three.camera);
  three.controls.update();
}

function addTouchDots() {
  Object.values(motionController.components).forEach((component) => {
    if (component.dataSource.dataSourceType === 'touchpadSource') {
      const componentRoot = motionControllerRoot.getObjectByName(component.rootNodeName, true);
      const touchDotRoot = componentRoot.getObjectByName(component.touchDotNodeName, true);

      const sphereGeometry = new THREE.SphereGeometry(0.001);
      const material = new THREE.MeshBasicMaterial({ color: 0x0000FF });
      const sphere = new THREE.Mesh(sphereGeometry, material);
      touchDotRoot.add(sphere);
    }
  });
}

const ModelViewer = {
  initialize: (element) => {
    parentElement = element;
    const width = parentElement.clientWidth;
    const height = parentElement.clientHeight;

    // Set up the THREE.js infrastructure
    three.camera = new THREE.PerspectiveCamera(75, width / height, 0.01, 1000);
    three.camera.position.y = 0.5;
    three.scene = new THREE.Scene();
    three.scene.background = new THREE.Color(0x00aa44);
    three.renderer = new THREE.WebGLRenderer();
    three.renderer.setSize(width, height);
    three.renderer.gammaOutput = true;

    three.controls = new OrbitControls(three.camera, three.renderer.domElement);
    three.controls.enableDamping = true;
    three.controls.minDistance = 0.05;
    three.controls.maxDistance = 0.13;
    three.controls.enablePan = false;
    three.controls.update();

    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.3);
    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 2.5);
    three.scene.add(ambientLight);
    three.scene.add(directionalLight);

    parentElement.appendChild(three.renderer.domElement);
    animationFrameCallback();
    window.addEventListener('resize', onResize, false);
  },

  loadAsset: async (controller) => {
    motionController = controller;
    three.loader = new GLTFLoader();
    await three.loader.load(motionController.assetPath, (gltf) => {
      three.scene.add(gltf.scene);
      motionControllerRoot = gltf.scene;
      addTouchDots();
    });
  }
};

export default ModelViewer;
