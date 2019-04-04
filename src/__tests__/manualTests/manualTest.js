/* eslint import/no-unresolved: off */

import { Constants, Profiles } from '../../../dist/webxr-input-profiles.module.js';
import { MockGamepad, MockXRInputSource } from '../../../dist/webxr-input-mocks.module.js';
import ModelViewer from './modelViewer.js';
import buildElements from './buildElements.js';

const profiles = new Profiles('../../../dist/profiles');
let mockXRInputSource;
let profile;
let motionController;

function onLoad() {
  const motionControllerElement = document.getElementById('motionController');
  ModelViewer.initialize(motionControllerElement);
  const gamepadId = 'microsoft-045e-065d';
  profiles.fetchProfile(['fake profile id', gamepadId]).then((fetchedProfile) => {
    profile = fetchedProfile;
    const mockGamepad = new MockGamepad(profile);
    mockXRInputSource = new MockXRInputSource(mockGamepad, Constants.Handedness.LEFT);
    profiles.createMotionController(mockXRInputSource).then((createdMotionController) => {
      motionController = createdMotionController;
      ModelViewer.loadAsset(motionController).then(() => {
        buildElements(motionController);
      });
    });
  });
}
window.addEventListener('load', onLoad);
