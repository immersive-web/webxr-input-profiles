import Constants from '../constants';

class MockXRInputSource {
  constructor(gamepad, handedness) {
    this.gamepad = gamepad;

    if (this.gamepad.hand) {
      if (this.gamepad.hand !== '') {
        this.handedness = this.gamepad.hand;
      } else {
        this.handedness = Constants.Handedness.NONE;
      }

      this.profiles = Object.freeze([`WebVR ${this.gamepad.id}`]);
    } else {
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
