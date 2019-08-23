import Constants from '../lib/constants';

/**
 * A fake XRInputSource that can be used to initialize a MotionController. Supports being created
 * from a WebVR style gamepad
 */
class MockXRInputSource {
  /**
   * @param {Object} gamepad - The Gamepad object that provides the button and axis data
   * @param {string} [handedness] - An optional value representing the handedness; not necessary
   * when the supplied gamepad is a WebVR gamepad
   */
  constructor(gamepad, handedness) {
    this.gamepad = gamepad;

    // Check if the gamepad is a WebVR gamepad
    if (this.gamepad.hand) {
      // Convert the WebVR definition of a NONE hand into the WebXR equivalent
      this.handedness = (this.gamepad.hand !== '') ? Constants.Handedness.NONE : this.gamepad.hand;

      // Build a WebXR style profiles array from the WebVR gamepad identification
      this.profiles = Object.freeze([`WebVR ${this.gamepad.id}`]);
    } else {
      // Require a handedness when a true mock
      if (!handedness) {
        throw new Error('No handedness available');
      }

      this.handedness = handedness;
      this.profiles = Object.freeze([this.gamepad.id]);
    }
  }

  getProfiles() {
    return this.profiles;
  }
}

export default MockXRInputSource;
